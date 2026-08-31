import { describe, it, expect } from 'vitest'
import { type Address } from 'viem'
import { mapVestingEvents } from '@/utils/accounting/mappers/vesting'
import { mapInvestorEvents } from '@/utils/accounting/mappers/investor'
import { assembleCncAccounting } from '@/utils/accounting/assemble'
import { makeCtx, ADDR, balanceOf } from './fixtures'

const ctx = makeCtx()

/** One schedule's three events, so a test only spells out what it varies. */
const SCHEDULE = { contractAddress: ADDR.safe, member: ADDR.member, scheduleIndex: '0' }

const grant = (amount: string, timestamp = 100) => ({ id: 'vc1', ...SCHEDULE, amount, timestamp })
const release = (amount: string, timestamp = 200, id = 'vr1') => ({
  id,
  ...SCHEDULE,
  amount,
  timestamp
})
const stop = (timestamp = 300) => ({ id: 'vs1', ...SCHEDULE, timestamp })

describe('mapVestingEvents', () => {
  it('books the grant upfront as Dr Deferred SHER Compensation · Cr SHERS To Be Issued', () => {
    // 100 SHER promised, $0.50 each → the whole $50 award is booked at definition.
    const [entry] = mapVestingEvents({ createds: [grant('100000000')] }, ctx)

    expect(entry).toMatchObject({
      useCase: 'UC-VEST-01',
      debit: 'Deferred SHER Compensation',
      credit: 'SHERS To Be Issued',
      amountUsd: 50,
      shares: 100,
      token: 'sher',
      counterparty: ADDR.member
    })
  })

  it('books a release as Dr SHERS To Be Issued · Cr Investor Equity', () => {
    // 25 SHER released, $0.50 each → $12.50 moves from promised to issued.
    const [entry] = mapVestingEvents({ releases: [release('25000000')] }, ctx)

    expect(entry).toMatchObject({
      useCase: 'UC-VEST-02',
      debit: 'SHERS To Be Issued',
      credit: 'Investor Equity',
      amountUsd: 12.5,
      shares: 25,
      token: 'sher',
      counterparty: ADDR.member
    })
  })

  it('reverses the unvested remainder of the grant when a schedule is stopped', () => {
    const entries = mapVestingEvents(
      {
        createds: [grant('100000000')],
        releases: [release('25000000')],
        stoppeds: [stop()]
      },
      ctx
    )
    const stopped = entries.find((entry) => entry.useCase === 'UC-VEST-03')

    // 100 promised − 25 released = 75 SHER unvested, $0.50 each → $37.50 unwound.
    expect(stopped).toMatchObject({
      debit: 'SHERS To Be Issued',
      credit: 'Deferred SHER Compensation',
      amountUsd: 37.5,
      shares: 75,
      counterparty: ADDR.member
    })
  })

  it('reverses the whole grant when a schedule is stopped before anything vests', () => {
    const entries = mapVestingEvents({ createds: [grant('100000000')], stoppeds: [stop()] }, ctx)
    const stopped = entries.find((entry) => entry.useCase === 'UC-VEST-03')

    expect(stopped).toMatchObject({ amountUsd: 50, shares: 100 })
  })

  it('leaves a stop with nothing unvested as a memo-only entry', () => {
    // Everything was released before the stop, so there is no grant left to reverse.
    const entries = mapVestingEvents(
      {
        createds: [grant('100000000')],
        releases: [release('100000000')],
        stoppeds: [stop()]
      },
      ctx
    )
    const stopped = entries.find((entry) => entry.useCase === 'UC-VEST-03')

    expect(stopped).toMatchObject({ debit: null, credit: null, amountUsd: 0 })
    expect(stopped?.shares).toBeUndefined()
  })

  it('books no reversal for a schedule whose grant is not in the feed', () => {
    // The grant predates the indexed window, so it was never booked — nothing to unwind.
    const entries = mapVestingEvents({ stoppeds: [stop()] }, ctx)

    expect(entries[0]).toMatchObject({ useCase: 'UC-VEST-03', debit: null, credit: null })
  })

  it('reverses each schedule against its own grant, not another schedule of the same member', () => {
    const entries = mapVestingEvents(
      {
        createds: [
          { ...grant('100000000'), scheduleIndex: '0' },
          { id: 'vc2', ...SCHEDULE, scheduleIndex: '1', amount: '40000000', timestamp: 120 }
        ],
        stoppeds: [{ id: 'vs2', ...SCHEDULE, scheduleIndex: '1', timestamp: 300 }]
      },
      ctx
    )
    const stopped = entries.find((entry) => entry.useCase === 'UC-VEST-03')

    // Schedule #1 promised 40 SHER; schedule #0 is untouched.
    expect(stopped).toMatchObject({ shares: 40, amountUsd: 20 })
  })
})

describe('vesting release backs the matching Investor mint', () => {
  it('drops the Investor mint emitted in the same release (no double-counted Default-D)', () => {
    const entries = mapInvestorEvents(
      {
        mints: [
          {
            id: 'm1',
            contractAddress: ADDR.safe,
            shareholder: ADDR.member,
            amount: '25000000',
            timestamp: 200
          }
        ],
        vestingReleases: [release('25000000')]
      },
      ctx
    )
    // The equity is booked by the vesting mapper (UC-VEST-02), so the investor
    // mapper must not re-book it as a direct mint.
    expect(entries).toHaveLength(0)
  })

  it('still books an unbacked mint as a Default-D share issuance', () => {
    const entries = mapInvestorEvents(
      {
        mints: [
          {
            id: 'm2',
            contractAddress: ADDR.safe,
            shareholder: ADDR.member,
            amount: '25000000',
            timestamp: 200
          }
        ],
        // A different amount → does not back the mint.
        vestingReleases: [release('9000000', 200, 'vr2')]
      },
      ctx
    )

    expect(entries[0]).toMatchObject({ id: 'm2', useCase: 'DEFAULT-D' })
  })
})

/** Assemble a team whose only feed is one vesting schedule and its mints. */
function assembleVesting(options: {
  createds: ReturnType<typeof grant>[]
  releases: ReturnType<typeof release>[]
  stoppeds: ReturnType<typeof stop>[]
  mintAmounts: string[]
}) {
  return assembleCncAccounting({
    contracts: [
      {
        type: 'Vesting',
        address: ADDR.safe as Address,
        deployer: ADDR.safe as Address,
        admins: []
      },
      {
        type: 'Investor',
        address: ADDR.sherToken as Address,
        deployer: ADDR.safe as Address,
        admins: []
      }
    ],
    sherTokenAddress: ADDR.sherToken,
    currentSherMultiplier: 2, // 2 SHER per USD → $0.50 each
    vestingEvents: {
      vestingCreateds: { items: options.createds },
      vestingTokensReleaseds: { items: options.releases },
      vestingStoppeds: { items: options.stoppeds }
    },
    investorEvents: {
      investorMints: {
        items: options.mintAmounts.map((amount, index) => ({
          id: `m${index + 1}`,
          contractAddress: ADDR.sherToken,
          shareholder: ADDR.member,
          amount,
          timestamp: 200
        }))
      },
      investorDividendDistributeds: { items: [] },
      investorDividendPaids: { items: [] },
      investorDividendPaymentFaileds: { items: [] }
    }
  })
}

describe('vesting through the whole pipeline', () => {
  it('keeps a partly released grant balanced: promised, issued and contra-equity all reconcile', () => {
    const acc = assembleVesting({
      createds: [grant('100000000')], // 100 SHER promised → $50
      releases: [release('25000000')], // 25 SHER released → $12.50
      stoppeds: [],
      mintAmounts: ['25000000']
    })

    // The equity is booked once by the vesting mapper; the twin mint is dropped.
    expect(acc.entries.filter((entry) => entry.useCase === 'DEFAULT-D')).toHaveLength(0)
    // Issued shares only ever come from an actual mint.
    expect(balanceOf(acc.entries, 'Investor Equity')).toBeCloseTo(12.5, 6)
    // The remaining 75 SHER stay promised but unminted.
    expect(balanceOf(acc.entries, 'SHERS To Be Issued')).toBeCloseTo(37.5, 6)
    // The whole award sits in contra-equity, so net equity is unchanged.
    expect(balanceOf(acc.entries, 'Deferred SHER Compensation')).toBeCloseTo(-50, 6)
    // Nothing on the income statement, and the books still balance.
    expect(acc.incomeStatement.netIncome).toBe(0)
    expect(acc.balanceSheet.balanced).toBe(true)
    expect(acc.balanceSheet.totalEquity).toBeCloseTo(0, 6)
  })

  it('nets a fully released grant to zero equity, with Investor Equity at the released value', () => {
    const acc = assembleVesting({
      createds: [grant('100000000')],
      releases: [release('100000000')],
      stoppeds: [],
      mintAmounts: ['100000000']
    })

    expect(balanceOf(acc.entries, 'Investor Equity')).toBeCloseTo(50, 6)
    expect(balanceOf(acc.entries, 'SHERS To Be Issued')).toBeCloseTo(0, 6)
    expect(balanceOf(acc.entries, 'Deferred SHER Compensation')).toBeCloseTo(-50, 6)
    expect(acc.incomeStatement.netIncome).toBe(0)
  })

  it('leaves only the vested part behind once a schedule is stopped', () => {
    const acc = assembleVesting({
      createds: [grant('100000000')], // 100 SHER promised
      releases: [release('25000000')], // 25 SHER vested and minted
      stoppeds: [stop()], // 75 SHER forfeited
      mintAmounts: ['25000000']
    })

    // Only the minted part survives: the forfeited remainder leaves no trace.
    expect(balanceOf(acc.entries, 'Investor Equity')).toBeCloseTo(12.5, 6)
    expect(balanceOf(acc.entries, 'SHERS To Be Issued')).toBeCloseTo(0, 6)
    expect(balanceOf(acc.entries, 'Deferred SHER Compensation')).toBeCloseTo(-12.5, 6)
    expect(acc.incomeStatement.netIncome).toBe(0)
  })

  it('unwinds the whole grant when a schedule is stopped before anything vests', () => {
    const acc = assembleVesting({
      createds: [grant('100000000')],
      releases: [],
      stoppeds: [stop()],
      mintAmounts: []
    })

    expect(balanceOf(acc.entries, 'Investor Equity')).toBe(0)
    expect(balanceOf(acc.entries, 'SHERS To Be Issued')).toBeCloseTo(0, 6)
    expect(balanceOf(acc.entries, 'Deferred SHER Compensation')).toBeCloseTo(0, 6)
  })

  it('keeps the three vesting actions visible in the books', () => {
    const acc = assembleVesting({
      createds: [grant('100000000')],
      releases: [release('25000000')],
      stoppeds: [stop()],
      mintAmounts: ['25000000']
    })

    expect(acc.entries.map((entry) => entry.useCase)).toEqual(
      expect.arrayContaining(['UC-VEST-01', 'UC-VEST-02', 'UC-VEST-03'])
    )
    expect(acc.entries.find((entry) => entry.useCase === 'UC-VEST-01')?.shares).toBe(100)
  })
})

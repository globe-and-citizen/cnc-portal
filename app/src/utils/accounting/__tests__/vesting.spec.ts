import { describe, it, expect } from 'vitest'
import { type Address } from 'viem'
import { mapVestingEvents } from '@/utils/accounting/mappers/vesting'
import { mapInvestorEvents } from '@/utils/accounting/mappers/investor'
import { assembleCncAccounting } from '@/utils/accounting/assemble'
import { makeCtx, ADDR, balanceOf } from './fixtures'

const ctx = makeCtx()

describe('mapVestingEvents', () => {
  it('books a grant as a memo-only entry (no monetary legs, share count only)', () => {
    const [entry] = mapVestingEvents(
      {
        createds: [
          {
            id: 'vc1',
            contractAddress: ADDR.safe,
            member: ADDR.member,
            scheduleIndex: '0',
            amount: '100000000000', // 100,000 SHER
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-VEST-01',
      debit: null,
      credit: null,
      amountUsd: 0,
      shares: 100000,
      counterparty: ADDR.member
    })
  })

  it('books a release as Dr Deferred SHER Compensation · Cr Investor Equity', () => {
    const [entry] = mapVestingEvents(
      {
        releases: [
          {
            id: 'vr1',
            contractAddress: ADDR.safe,
            member: ADDR.member,
            scheduleIndex: '0',
            amount: '25000000', // 25 SHER, $0.50 each → $12.50
            timestamp: 200
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-VEST-02',
      debit: 'Deferred SHER Compensation',
      credit: 'Investor Equity',
      amountUsd: 12.5,
      shares: 25,
      token: 'sher',
      counterparty: ADDR.member
    })
  })

  it('books a stop as a memo-only entry (unvested remainder dropped)', () => {
    const [entry] = mapVestingEvents(
      {
        stoppeds: [
          {
            id: 'vs1',
            contractAddress: ADDR.safe,
            member: ADDR.member,
            scheduleIndex: '0',
            timestamp: 300
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-VEST-03',
      debit: null,
      credit: null,
      amountUsd: 0
    })
    expect(entry.shares).toBeUndefined()
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
        vestingReleases: [
          {
            id: 'vr1',
            contractAddress: ADDR.safe,
            member: ADDR.member,
            scheduleIndex: '0',
            amount: '25000000',
            timestamp: 200
          }
        ]
      },
      ctx
    )
    // The equity is booked by the vesting mapper (UC-VEST-02), so the investor
    // mapper must not re-book it as a direct mint.
    expect(entries).toHaveLength(0)
  })

  it('still books an unbacked mint as a Default-D share issuance', () => {
    const [entry] = mapInvestorEvents(
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
        vestingReleases: [
          {
            id: 'vr2',
            contractAddress: ADDR.safe,
            member: ADDR.member,
            scheduleIndex: '0',
            amount: '9000000', // different amount → does not back the mint
            timestamp: 200
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({ id: 'm2', useCase: 'DEFAULT-D' })
  })
})

describe('vesting through the whole pipeline', () => {
  it('books the release once as neutral equity and never drives SHERS To Be Issued negative', () => {
    const acc = assembleCncAccounting({
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
        vestingCreateds: {
          items: [
            {
              id: 'vc1',
              contractAddress: ADDR.safe,
              member: ADDR.member,
              scheduleIndex: '0',
              amount: '100000000000',
              timestamp: 100
            }
          ]
        },
        vestingTokensReleaseds: {
          items: [
            {
              id: 'vr1',
              contractAddress: ADDR.safe,
              member: ADDR.member,
              scheduleIndex: '0',
              amount: '25000000',
              timestamp: 200
            }
          ]
        },
        vestingStoppeds: { items: [] }
      },
      investorEvents: {
        investorMints: {
          items: [
            {
              id: 'm1',
              contractAddress: ADDR.sherToken,
              shareholder: ADDR.member,
              amount: '25000000',
              timestamp: 200
            }
          ]
        },
        investorDividendDistributeds: { items: [] },
        investorDividendPaids: { items: [] },
        investorDividendPaymentFaileds: { items: [] }
      }
    })

    // Equity booked once by the vesting mapper; the twin mint is dropped.
    expect(acc.entries.filter((e) => e.useCase === 'DEFAULT-D')).toHaveLength(0)
    expect(balanceOf(acc.entries, 'Investor Equity')).toBeCloseTo(12.5, 6)
    // Contra-equity neutralises it: net equity effect is zero, nothing on the P&L.
    expect(balanceOf(acc.entries, 'Deferred SHER Compensation')).toBeCloseTo(-12.5, 6)
    // The old bug: an unbacked mint would debit this into a negative balance.
    expect(balanceOf(acc.entries, 'SHERS To Be Issued')).toBe(0)
    // The grant memo survives consolidation as a share-count-only row.
    expect(acc.entries.some((e) => e.useCase === 'UC-VEST-01' && e.shares === 100000)).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { settleSherIssuances } from '@/utils/accounting/mappers/sherIssuance'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { round6 } from '@/utils/accounting/toUsd'
import { ADDR } from './fixtures'

/** Whole SHER → base units (6 decimals). */
function raw(sher: number): string {
  return String(BigInt(Math.round(sher * 1e6)))
}

/** A SHER wage accrual (UC-CASH-02): Cr Shares to be issued, frozen at its date. */
function accrual(sher: number, amountUsd: number, over: Partial<LedgerEntry> = {}) {
  return makeEntry({
    id: `accrual-${over.id ?? sher}`,
    timestamp: 100,
    useCase: 'UC-CASH-02',
    debit: 'Share-based Compensation',
    credit: 'Shares to be issued',
    amountUsd,
    token: 'sher',
    rawAmount: raw(sher),
    counterparty: ADDR.member,
    memo: 'Wage earned',
    ...over
  })
}

/** A SHER issuance (UC-CASH-03 withdrawal or DEFAULT-D mint): Dr Shares to be issued. */
function issuance(sher: number, amountUsd: number, over: Partial<LedgerEntry> = {}) {
  return makeEntry({
    id: `issue-${over.id ?? sher}`,
    timestamp: 200,
    useCase: 'UC-CASH-03',
    debit: 'Shares to be issued',
    credit: 'Investor Equity',
    amountUsd,
    token: 'sher',
    rawAmount: raw(sher),
    counterparty: ADDR.member,
    memo: 'Wage paid in shares',
    ...over
  })
}

/** Net USD balance of `Shares to be issued` across all entries (Σ debits − Σ credits). */
function sharesToBeIssuedNet(entries: readonly LedgerEntry[]): number {
  let net = 0
  for (const e of entries) {
    if (e.debit === 'Shares to be issued') net += e.amountUsd
    if (e.credit === 'Shares to be issued') net -= e.amountUsd
  }
  return round6(net)
}

describe('settleSherIssuances', () => {
  it('settles an issuance at the frozen accrual value when the multiplier moved', () => {
    // 50 SHER accrued at $50 (1x); the multiplier moves to 10x, so the issuance
    // leg arrives valued at $5 — it must settle at the promised $50 instead.
    const entries = [accrual(50, 50), issuance(50, 5, { rate: 0.1 })]
    const [, settled] = settleSherIssuances(entries)
    expect(settled.amountUsd).toBe(50)
    expect(settled.rate).toBe(1) // the frozen accrual rate, not the day's
    expect(sharesToBeIssuedNet(settleSherIssuances(entries))).toBe(0)
  })

  it('leaves the issuance unchanged when the multiplier was the same at both dates', () => {
    const entries = [accrual(50, 50), issuance(50, 50, { rate: 1 })]
    const [, settled] = settleSherIssuances(entries)
    expect(settled.amountUsd).toBe(50)
    expect(settled.rate).toBe(1)
  })

  it('never books a gain or loss — equity receives what was contributed', () => {
    // Whatever the multiplier did, the only accounts touched stay the entry's own.
    const entries = settleSherIssuances([accrual(100, 100), issuance(100, 16.67)])
    expect(entries).toHaveLength(2) // no extra revaluation posting
    expect(entries[1].credit).toBe('Investor Equity')
    expect(entries[1].amountUsd).toBe(100)
  })

  it('consumes several accruals FIFO for one withdrawal (weighted frozen value)', () => {
    // Week 1: 50 SHER @ $1 = $50; week 2 (after 10x): 50 SHER @ $0.10 = $5.
    // A single 100-SHER withdrawal settles both → $55.
    const entries = [
      accrual(50, 50, { id: 'w1', timestamp: 100 }),
      accrual(50, 5, { id: 'w2', timestamp: 110 }),
      issuance(100, 10, { timestamp: 200 })
    ]
    const settled = settleSherIssuances(entries)[2]
    expect(settled.amountUsd).toBe(55)
    expect(settled.rate).toBe(0.55) // 55 / 100 — quantity-weighted
    expect(sharesToBeIssuedNet(settleSherIssuances(entries))).toBe(0)
  })

  it('settles partial withdrawals against one accrual, FIFO across issuances', () => {
    // 100 SHER accrued at $100, withdrawn in two halves at a different day rate.
    const entries = [
      accrual(100, 100),
      issuance(50, 5, { id: 's1', timestamp: 200 }),
      issuance(50, 5, { id: 's2', timestamp: 210 })
    ]
    const [, first, second] = settleSherIssuances(entries)
    expect(first.amountUsd).toBe(50)
    expect(second.amountUsd).toBe(50)
    expect(sharesToBeIssuedNet(settleSherIssuances(entries))).toBe(0)
  })

  it('keeps the own-date valuation for a direct mint with no accrual behind it', () => {
    // An investor mint is cash-for-shares on its own day — nothing to settle.
    const mint = issuance(100, 20, { id: 'mint', useCase: 'DEFAULT-D' })
    const [settled] = settleSherIssuances([mint])
    expect(settled.amountUsd).toBe(20)
  })

  it('a direct mint dated before the accrual leaves it for the real withdrawal', () => {
    // Shares granted at t=50 pre-date the work (accrued t=100): the mint keeps
    // its own-date value and the later withdrawal still settles the frozen $50.
    const entries = [
      issuance(50, 10, { id: 'mint', useCase: 'DEFAULT-D', timestamp: 50 }),
      accrual(50, 50, { timestamp: 100 }),
      issuance(50, 5, { id: 'wd', timestamp: 200 })
    ]
    const settled = settleSherIssuances(entries)
    expect(settled[0].amountUsd).toBe(10) // mint: own-date value, queue untouched
    expect(settled[2].amountUsd).toBe(50) // withdrawal: the frozen accrual value
  })

  it('a wage withdrawal settles even when booked before its accrual date', () => {
    // The accrual is dated at week end (Sunday noon), so an early payout can
    // precede it — UC-CASH-03 is not time-restricted.
    const entries = [accrual(50, 50, { timestamp: 200 }), issuance(50, 5, { timestamp: 150 })]
    const [, settled] = settleSherIssuances(entries)
    expect(settled.amountUsd).toBe(50)
  })

  it('values only the accrual-backed part of an oversized issuance at frozen value', () => {
    // 50 SHER accrued at $50 (1x); 100 SHER issued while the day rate is $0.10:
    // 50 settle the accrual ($50), the other 50 are a direct mint at $0.10 ($5).
    const entries = [accrual(50, 50), issuance(100, 10)]
    const [, settled] = settleSherIssuances(entries)
    expect(settled.amountUsd).toBe(55)
  })

  it('does not settle another member’s accrual', () => {
    const other = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
    const entries = [accrual(50, 50), issuance(50, 5, { counterparty: other })]
    const [, settled] = settleSherIssuances(entries)
    expect(settled.amountUsd).toBe(5) // no accrual for that member — own-date value
  })

  it('leaves an unissued accrual alone (a liability at its frozen value)', () => {
    const entries = settleSherIssuances([accrual(100, 100)])
    expect(entries[0].amountUsd).toBe(100)
    expect(sharesToBeIssuedNet(entries)).toBe(-100) // outstanding promise
  })
})

import { describe, it, expect } from 'vitest'
import { settleWithdrawnSher } from '@/utils/accounting/mappers/sherIssuance'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { round6 } from '@/utils/accounting/toUsd'
import { ADDR } from './fixtures'

/** Whole SHER → base units (6 decimals). */
function raw(sher: number): string {
  return String(BigInt(Math.round(sher * 1e6)))
}

/** A SHER wage accrual (UC-CASH-02): Cr Shares to be issued. Its stamped USD is a
 *  placeholder — settleWithdrawnSher recomputes it. */
function accrual(sher: number, over: Partial<LedgerEntry> = {}) {
  return makeEntry({
    id: `accrual-${over.id ?? sher}`,
    timestamp: 100,
    useCase: 'UC-CASH-02',
    debit: 'Share-based Compensation',
    credit: 'Shares to be issued',
    amountUsd: 0,
    token: 'sher',
    rawAmount: raw(sher),
    counterparty: ADDR.member,
    memo: 'Wage earned',
    ...over
  })
}

/** A SHER issuance (UC-CASH-03 withdrawal / DEFAULT-D mint) frozen at `rate` on its date. */
function withdrawal(sher: number, rate: number, over: Partial<LedgerEntry> = {}) {
  return makeEntry({
    id: `withdraw-${over.id ?? sher}`,
    timestamp: 200,
    useCase: 'UC-CASH-03',
    debit: 'Shares to be issued',
    credit: 'Investor Equity',
    amountUsd: round6(sher * rate),
    rate,
    token: 'sher',
    rawAmount: raw(sher),
    counterparty: ADDR.member,
    memo: 'Wage paid in shares',
    ...over
  })
}

/** Open `Shares to be issued` liability (credit-normal): Σ credits − Σ debits. */
function sharesToBeIssuedNet(entries: readonly LedgerEntry[]): number {
  let net = 0
  for (const e of entries) {
    if (e.credit === 'Shares to be issued') net += e.amountUsd
    if (e.debit === 'Shares to be issued') net -= e.amountUsd
  }
  return round6(net)
}

const find = (entries: readonly LedgerEntry[], id: string) => entries.find((e) => e.id === id)!

describe('settleWithdrawnSher', () => {
  it('floats a never-withdrawn accrual at the current rate', () => {
    // 50 SHER accrued, never withdrawn; current multiplier 5x → $0.20 / SHER.
    const [a] = settleWithdrawnSher([accrual(50)], 0.2)
    expect(a.amountUsd).toBe(10) // 50 × 0.20
    expect(a.rate).toBe(0.2)
  })

  it('freezes a withdrawn accrual at its withdraw-date rate, ignoring the current one', () => {
    // Withdrawn at 5x ($0.20); the rate later moves to 10x ($0.10) — the withdrawn
    // batch must stay at the realization value, not follow the current rate.
    const settled = settleWithdrawnSher([accrual(50), withdrawal(50, 0.2)], 0.1)
    const a = find(settled, 'accrual-50')
    const w = find(settled, 'withdraw-50')
    expect(a.amountUsd).toBe(10) // frozen at 50 × 0.20, not 50 × 0.10
    expect(w.amountUsd).toBe(10) // the withdrawal itself is untouched
    expect(sharesToBeIssuedNet(settled)).toBe(0) // matched legs cancel
  })

  it('weights a partly-withdrawn accrual: withdrawn part frozen, the rest at current', () => {
    // 100 SHER accrued; 40 withdrawn at 5x ($0.20); current 2x ($0.50).
    const settled = settleWithdrawnSher([accrual(100), withdrawal(40, 0.2)], 0.5)
    const a = find(settled, 'accrual-100')
    expect(a.amountUsd).toBe(38) // 40×0.20 (frozen) + 60×0.50 (current)
    expect(a.rate).toBe(0.38)
    // Shares to be issued left open = the pending 60 SHER at the current rate.
    expect(sharesToBeIssuedNet(settled)).toBe(30)
  })

  it('consumes accruals FIFO across a single withdrawal', () => {
    const a1 = accrual(30, { id: 'a1', timestamp: 100 })
    const a2 = accrual(30, { id: 'a2', timestamp: 150 })
    const w = withdrawal(50, 0.2, { id: 'w1', timestamp: 200 }) // withdraw 50 at 5x
    const settled = settleWithdrawnSher([a1, a2, w], 1) // current 1x → $1
    expect(find(settled, 'a1').amountUsd).toBe(6) // fully withdrawn: 30 × 0.20
    expect(find(settled, 'a2').amountUsd).toBe(14) // 20×0.20 frozen + 10×1 current
    expect(sharesToBeIssuedNet(settled)).toBe(10) // pending 10 SHER × $1
  })

  it('lets a direct mint settle only accruals dated before it', () => {
    const before = accrual(20, { id: 'before', timestamp: 100 })
    const after = accrual(20, { id: 'after', timestamp: 300 })
    const mint = withdrawal(20, 0.2, { id: 'mint', useCase: 'DEFAULT-D', timestamp: 200 })
    const settled = settleWithdrawnSher([before, after, mint], 0.5)
    expect(find(settled, 'before').amountUsd).toBe(4) // consumed → frozen 20 × 0.20
    expect(find(settled, 'after').amountUsd).toBe(10) // dated after the mint → 20 × 0.50
  })

  it('never consumes another member’s accrual', () => {
    const mine = accrual(50, { id: 'mine', counterparty: ADDR.member })
    const other = withdrawal(50, 0.2, { id: 'other', counterparty: ADDR.founder })
    const settled = settleWithdrawnSher([mine, other], 0.5)
    expect(find(settled, 'mine').amountUsd).toBe(25) // stays pending → 50 × 0.50
    expect(find(settled, 'other').amountUsd).toBe(10) // withdrawal keeps its own value
  })
})

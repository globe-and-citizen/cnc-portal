import { describe, it, expect } from 'vitest'
import type { WeeklyClaim } from '@/types/cash-remuneration'
import { mapPayrollAccruals } from '@/utils/accounting/mappers/payrollAccrual'
import { makeCtx, ADDR } from './fixtures'

const ctx = makeCtx() // toUsd: native $2, usdc $1, sher $0.50

/** Build a minimal submitted weekly claim. */
function claim(over: Partial<WeeklyClaim> = {}): WeeklyClaim {
  return {
    id: 1,
    status: 'pending',
    weekStart: new Date(1_000_000).toISOString(),
    createdAt: new Date(1_000_000).toISOString(),
    memberAddress: ADDR.member as `0x${string}`,
    minutesWorked: 120, // 2h
    wage: { ratePerHour: [{ type: 'usdc', amount: 25 }] },
    claims: [],
    ...over
  } as WeeklyClaim
}

describe('mapPayrollAccruals', () => {
  it('accrues a submitted claim: Dr Payroll Expense / Cr Wage Payable at the wage rate', () => {
    const [entry] = mapPayrollAccruals([claim()], ctx)
    expect(entry).toMatchObject({
      useCase: 'UC-CASH-02',
      debit: 'Payroll Expense',
      credit: 'Wage Payable',
      category: 'Payroll'
    })
    expect(entry.amountUsd).toBe(50) // 2h × 25 USDC × $1
  })

  it('books the SHER rate as Share-based Compensation against Shares to be issued', () => {
    const [entry] = mapPayrollAccruals(
      [claim({ wage: { ratePerHour: [{ type: 'sher', amount: 10 }] } } as Partial<WeeklyClaim>)],
      ctx
    )
    expect(entry.debit).toBe('Share-based Compensation')
    expect(entry.credit).toBe('Shares to be issued')
    expect(entry.amountUsd).toBe(10) // 2h × 10 SHER × $0.50
  })

  it('splits a multi-token wage into one balanced posting per rate', () => {
    const entries = mapPayrollAccruals(
      [
        claim({
          wage: {
            ratePerHour: [
              { type: 'usdc', amount: 25 },
              { type: 'sher', amount: 10 }
            ]
          }
        } as Partial<WeeklyClaim>)
      ],
      ctx
    )
    expect(entries).toHaveLength(2)
    expect(entries.map((e) => e.debit)).toEqual(['Payroll Expense', 'Share-based Compensation'])
    expect(entries.map((e) => e.credit)).toEqual(['Wage Payable', 'Shares to be issued'])
  })

  it('values overtime minutes at the overtime rate (reuses the canonical wage calc)', () => {
    const [entry] = mapPayrollAccruals(
      [
        claim({
          minutesWorked: 180, // 3h
          wage: {
            maximumHoursPerWeek: 2, // 2h regular, 1h overtime
            ratePerHour: [{ type: 'usdc', amount: 10 }],
            overtimeRatePerHour: [{ type: 'usdc', amount: 20 }]
          }
        } as Partial<WeeklyClaim>)
      ],
      ctx
    )
    // 2h × $10 + 1h × $20 = $40 — the old flat calc would wrongly book 3h × $10 = $30.
    expect(entry.amountUsd).toBe(40)
  })

  it('does not accrue a disabled (cancelled) claim', () => {
    expect(mapPayrollAccruals([claim({ status: 'disabled' })], ctx)).toHaveLength(0)
  })

  it('does not accrue a week still in progress (relative to now)', () => {
    const weekStart = new Date('2026-06-22T00:00:00Z') // Monday
    const midWeek = new Date('2026-06-24T00:00:00Z').getTime() // before the week closes
    expect(
      mapPayrollAccruals([claim({ weekStart: weekStart.toISOString() })], ctx, midWeek)
    ).toHaveLength(0)
  })

  it('accrues once the week has ended', () => {
    const weekStart = new Date('2026-06-22T00:00:00Z') // Monday
    const afterWeek = new Date('2026-06-29T00:00:00Z').getTime() // week closed
    expect(
      mapPayrollAccruals([claim({ weekStart: weekStart.toISOString() })], ctx, afterWeek)
    ).toHaveLength(1)
  })

  it('dates the accrual at submission (createdAt)', () => {
    const created = new Date('2026-03-10T00:00:00Z')
    const [entry] = mapPayrollAccruals([claim({ createdAt: created.toISOString() })], ctx)
    expect(entry.timestamp).toBe(Math.floor(created.getTime() / 1000))
  })
})

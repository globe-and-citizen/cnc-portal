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

  it('books the SHER rate against Shares to be issued', () => {
    const [entry] = mapPayrollAccruals(
      [claim({ wage: { ratePerHour: [{ type: 'sher', amount: 10 }] } } as Partial<WeeklyClaim>)],
      ctx
    )
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
    expect(entries.map((e) => e.credit)).toEqual(['Wage Payable', 'Shares to be issued'])
  })

  it('does not accrue a disabled (cancelled) claim', () => {
    expect(mapPayrollAccruals([claim({ status: 'disabled' })], ctx)).toHaveLength(0)
  })

  it('dates the accrual at submission (createdAt)', () => {
    const created = new Date('2026-03-10T00:00:00Z')
    const [entry] = mapPayrollAccruals([claim({ createdAt: created.toISOString() })], ctx)
    expect(entry.timestamp).toBe(Math.floor(created.getTime() / 1000))
  })
})

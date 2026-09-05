import { describe, it, expect } from 'vitest'
import {
  ALLOWED_BY_DIRECTION,
  resolveClassifiedAccounts,
  type ClassificationCategory,
  type ClassificationDirection
} from '@/utils/accounting/classification'

const BANK = 'Cash — Bank'
const SAFE = 'Cash — Safe'
const PAYROLL = 'Cash — Payroll'

describe('direction constraints', () => {
  const resolve = (direction: ClassificationDirection, category: ClassificationCategory) =>
    resolveClassifiedAccounts({ direction, cashAccount: BANK, category })

  it('allows revenue only on an inflow', () => {
    expect(resolve('in', 'REVENUE')).not.toBeNull()
    expect(resolve('out', 'REVENUE')).toBeNull()
  })

  it('allows an expense only on an outflow', () => {
    expect(resolve('out', 'EXPENSE')).not.toBeNull()
    expect(resolve('in', 'EXPENSE')).toBeNull()
  })

  it('allows capital both ways', () => {
    for (const direction of ['in', 'out'] as ClassificationDirection[]) {
      expect(resolve(direction, 'OWNER_CAPITAL')).not.toBeNull()
    }
  })

  it('offers each direction its own menu', () => {
    expect(ALLOWED_BY_DIRECTION.in).toContain('REVENUE')
    expect(ALLOWED_BY_DIRECTION.in).not.toContain('EXPENSE')
    expect(ALLOWED_BY_DIRECTION.out).toContain('EXPENSE')
    expect(ALLOWED_BY_DIRECTION.out).not.toContain('REVENUE')
  })
})

describe('resolveClassifiedAccounts — deposits (cash in)', () => {
  it('books revenue as Dr Cash · Cr Service Revenue', () => {
    expect(
      resolveClassifiedAccounts({ direction: 'in', cashAccount: BANK, category: 'REVENUE' })
    ).toEqual({ debit: BANK, credit: 'Service Revenue', internal: false })
  })

  it('books an owner contribution as Dr Cash · Cr Owner Capital', () => {
    expect(
      resolveClassifiedAccounts({ direction: 'in', cashAccount: BANK, category: 'OWNER_CAPITAL' })
    ).toEqual({ debit: BANK, credit: 'Owner Capital', internal: false })
  })

  it('uses the Safe cash pocket when that is the source', () => {
    expect(
      resolveClassifiedAccounts({ direction: 'in', cashAccount: SAFE, category: 'REVENUE' })
    ).toEqual({ debit: SAFE, credit: 'Service Revenue', internal: false })
  })

  it('rejects an expense on an inflow', () => {
    expect(
      resolveClassifiedAccounts({ direction: 'in', cashAccount: BANK, category: 'EXPENSE' })
    ).toBeNull()
  })
})

describe('resolveClassifiedAccounts — withdrawals (cash out)', () => {
  it('books an expense as Dr Operating Expense · Cr Cash', () => {
    expect(
      resolveClassifiedAccounts({ direction: 'out', cashAccount: BANK, category: 'EXPENSE' })
    ).toEqual({ debit: 'Operating Expense', credit: BANK, internal: false })
  })

  it('books an owner draw as Dr Owner Capital · Cr Cash', () => {
    expect(
      resolveClassifiedAccounts({ direction: 'out', cashAccount: BANK, category: 'OWNER_CAPITAL' })
    ).toEqual({ debit: 'Owner Capital', credit: BANK, internal: false })
  })

  it('books a payroll payment as Dr Payroll Expense · Cr Cash', () => {
    expect(
      resolveClassifiedAccounts({
        direction: 'out',
        cashAccount: BANK,
        category: 'PAYROLL_EXPENSE'
      })
    ).toEqual({ debit: 'Payroll Expense', credit: BANK, internal: false })
  })

  it('books a loan interest payment as Dr Interest Expense · Cr Cash', () => {
    expect(
      resolveClassifiedAccounts({
        direction: 'out',
        cashAccount: BANK,
        category: 'INTEREST_EXPENSE'
      })
    ).toEqual({ debit: 'Interest Expense', credit: BANK, internal: false })
  })

  it('books a dividend payment as Dr Dividend Expense · Cr Cash', () => {
    expect(
      resolveClassifiedAccounts({
        direction: 'out',
        cashAccount: BANK,
        category: 'DIVIDEND_EXPENSE'
      })
    ).toEqual({ debit: 'Dividend Expense', credit: BANK, internal: false })
  })

  it('rejects revenue on an outflow', () => {
    expect(
      resolveClassifiedAccounts({ direction: 'out', cashAccount: BANK, category: 'REVENUE' })
    ).toBeNull()
  })

  it('rejects an expense-only category on an inflow', () => {
    expect(
      resolveClassifiedAccounts({
        direction: 'in',
        cashAccount: BANK,
        category: 'DIVIDEND_EXPENSE'
      })
    ).toBeNull()
  })
})

describe('resolveClassifiedAccounts — internal transfer', () => {
  it('credits the source pocket on an inflow', () => {
    expect(
      resolveClassifiedAccounts({
        direction: 'in',
        cashAccount: BANK,
        category: 'INTERNAL_TRANSFER',
        pocket: PAYROLL
      })
    ).toEqual({ debit: BANK, credit: PAYROLL, internal: true })
  })

  it('debits the destination pocket on an outflow', () => {
    expect(
      resolveClassifiedAccounts({
        direction: 'out',
        cashAccount: BANK,
        category: 'INTERNAL_TRANSFER',
        pocket: PAYROLL
      })
    ).toEqual({ debit: PAYROLL, credit: BANK, internal: true })
  })

  it('cannot book an internal transfer without a known pocket', () => {
    expect(
      resolveClassifiedAccounts({
        direction: 'in',
        cashAccount: BANK,
        category: 'INTERNAL_TRANSFER'
      })
    ).toBeNull()
  })
})

describe('guaranteed-internal invariant', () => {
  it('refuses to reclassify an internal move into income or expense', () => {
    expect(
      resolveClassifiedAccounts({
        direction: 'in',
        cashAccount: BANK,
        category: 'REVENUE',
        pocket: PAYROLL
      })
    ).toBeNull()
    expect(
      resolveClassifiedAccounts({
        direction: 'out',
        cashAccount: BANK,
        category: 'EXPENSE',
        pocket: PAYROLL
      })
    ).toBeNull()
  })

  it('still books a guaranteed-internal move as an internal transfer', () => {
    expect(
      resolveClassifiedAccounts({
        direction: 'in',
        cashAccount: BANK,
        category: 'INTERNAL_TRANSFER',
        pocket: PAYROLL
      })
    ).toEqual({ debit: BANK, credit: PAYROLL, internal: true })
  })
})

describe('every resolved classification is a balanced pair', () => {
  it('has two distinct, defined accounts', () => {
    const directions: ClassificationDirection[] = ['in', 'out']
    for (const direction of directions) {
      for (const category of ALLOWED_BY_DIRECTION[direction] as ClassificationCategory[]) {
        const result = resolveClassifiedAccounts({
          direction,
          cashAccount: BANK,
          category,
          ...(category === 'INTERNAL_TRANSFER' ? { pocket: PAYROLL } : {})
        })
        expect(result).not.toBeNull()
        expect(result?.debit).toBeTruthy()
        expect(result?.credit).toBeTruthy()
        expect(result?.debit).not.toBe(result?.credit)
      }
    }
  })
})

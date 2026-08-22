import { describe, it, expect } from 'vitest'
import {
  ALLOWED_BY_DIRECTION,
  CLASSIFICATION_CATEGORIES,
  allowedCategories,
  isClassificationAllowed,
  resolveClassifiedAccounts,
  type ClassificationCategory,
  type ClassificationDirection
} from '@/utils/accounting/classification'

const BANK = 'Cash — Bank'
const SAFE = 'Cash — Safe'
const PAYROLL = 'Cash — Payroll'

describe('classification categories', () => {
  it('exposes the supported categories', () => {
    expect(CLASSIFICATION_CATEGORIES).toEqual([
      'REVENUE',
      'EXPENSE',
      'SHAREHOLDER_LOAN',
      'OWNER_CAPITAL',
      'INTERNAL_TRANSFER',
      'PAYROLL_EXPENSE',
      'INTEREST_EXPENSE',
      'DIVIDEND_EXPENSE'
    ])
  })
})

describe('isClassificationAllowed', () => {
  it('allows revenue only on an inflow', () => {
    expect(isClassificationAllowed('in', 'REVENUE')).toBe(true)
    expect(isClassificationAllowed('out', 'REVENUE')).toBe(false)
  })

  it('allows an expense only on an outflow', () => {
    expect(isClassificationAllowed('out', 'EXPENSE')).toBe(true)
    expect(isClassificationAllowed('in', 'EXPENSE')).toBe(false)
  })

  it('allows capital, loan and internal transfer both ways', () => {
    for (const direction of ['in', 'out'] as ClassificationDirection[]) {
      expect(isClassificationAllowed(direction, 'OWNER_CAPITAL')).toBe(true)
      expect(isClassificationAllowed(direction, 'SHAREHOLDER_LOAN')).toBe(true)
      expect(isClassificationAllowed(direction, 'INTERNAL_TRANSFER')).toBe(true)
    }
  })

  it('permits only an internal transfer on a guaranteed-internal movement', () => {
    for (const direction of ['in', 'out'] as ClassificationDirection[]) {
      expect(
        isClassificationAllowed(direction, 'INTERNAL_TRANSFER', { guaranteedInternal: true })
      ).toBe(true)
      for (const category of ['REVENUE', 'EXPENSE', 'OWNER_CAPITAL', 'SHAREHOLDER_LOAN'] as const) {
        expect(isClassificationAllowed(direction, category, { guaranteedInternal: true })).toBe(
          false
        )
      }
    }
  })
})

describe('allowedCategories', () => {
  it('offers the direction-appropriate set', () => {
    expect(allowedCategories('in')).toEqual(ALLOWED_BY_DIRECTION.in)
    expect(allowedCategories('out')).toEqual(ALLOWED_BY_DIRECTION.out)
  })

  it('narrows to just internal transfer when guaranteed internal', () => {
    expect(allowedCategories('in', { guaranteedInternal: true })).toEqual(['INTERNAL_TRANSFER'])
    expect(allowedCategories('out', { guaranteedInternal: true })).toEqual(['INTERNAL_TRANSFER'])
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

  it('books a shareholder loan as Dr Cash · Cr Loan Payable', () => {
    expect(
      resolveClassifiedAccounts({
        direction: 'in',
        cashAccount: BANK,
        category: 'SHAREHOLDER_LOAN'
      })
    ).toEqual({ debit: BANK, credit: 'Loan Payable', internal: false })
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

  it('books a loan repayment as Dr Loan Payable · Cr Cash', () => {
    expect(
      resolveClassifiedAccounts({
        direction: 'out',
        cashAccount: BANK,
        category: 'SHAREHOLDER_LOAN'
      })
    ).toEqual({ debit: 'Loan Payable', credit: BANK, internal: false })
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
        guaranteedInternal: true
      })
    ).toBeNull()
    expect(
      resolveClassifiedAccounts({
        direction: 'out',
        cashAccount: BANK,
        category: 'EXPENSE',
        guaranteedInternal: true
      })
    ).toBeNull()
  })

  it('still books a guaranteed-internal move as an internal transfer', () => {
    expect(
      resolveClassifiedAccounts({
        direction: 'in',
        cashAccount: BANK,
        category: 'INTERNAL_TRANSFER',
        pocket: PAYROLL,
        guaranteedInternal: true
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
          pocket: PAYROLL
        })
        expect(result).not.toBeNull()
        expect(result?.debit).toBeTruthy()
        expect(result?.credit).toBeTruthy()
        expect(result?.debit).not.toBe(result?.credit)
      }
    }
  })
})

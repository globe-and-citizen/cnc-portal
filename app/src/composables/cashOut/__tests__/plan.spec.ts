import { describe, it, expect } from 'vitest'
import { buildCashOutPlan } from '../plan'

const keys = (balances: Parameters<typeof buildCashOutPlan>[0]) =>
  buildCashOutPlan(balances).map((s) => s.key)

describe('buildCashOutPlan', () => {
  it('returns no steps when every account is empty', () => {
    expect(buildCashOutPlan({ cashRemuneration: 0, expense: 0, bank: 0 })).toEqual([])
  })

  it('keeps source accounts before the Bank and Bank always last', () => {
    expect(keys({ cashRemuneration: 5, expense: 5, bank: 5 })).toEqual([
      'cashRemuneration',
      'expense',
      'bank'
    ])
  })

  it('includes the Bank step even when only a source account has funds (consolidation)', () => {
    expect(keys({ cashRemuneration: 5, expense: 0, bank: 0 })).toEqual(['cashRemuneration', 'bank'])
    expect(keys({ cashRemuneration: 0, expense: 5, bank: 0 })).toEqual(['expense', 'bank'])
  })

  it('skips empty source accounts', () => {
    expect(keys({ cashRemuneration: 0, expense: 3, bank: 7 })).toEqual(['expense', 'bank'])
  })

  it('returns only the Bank step when just the Bank holds funds', () => {
    expect(keys({ cashRemuneration: 0, expense: 0, bank: 7 })).toEqual(['bank'])
  })

  it('labels each step with its human-readable name', () => {
    const plan = buildCashOutPlan({ cashRemuneration: 1, expense: 1, bank: 1 })
    expect(plan.map((s) => s.label)).toEqual(['Cash Remuneration', 'Expense Account', 'Bank'])
  })

  it('treats negative balances as empty', () => {
    expect(buildCashOutPlan({ cashRemuneration: -1, expense: -1, bank: -1 })).toEqual([])
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import ExpenseAccountTotalApproved from '../ExpenseAccountTotalApproved.vue'
import { createMockQueryResponse } from '@/tests/mocks'
import { useGetExpensesQuery } from '@/queries/expense.queries'

describe('ExpenseAccountTotalApproved', () => {
  beforeEach(() => {
    vi.mocked(useGetExpensesQuery).mockReturnValue(createMockQueryResponse([]))
  })

  const amountText = () => mount(ExpenseAccountTotalApproved).find('[data-test="amount"]').text()

  it('counts distinct approved members, ignoring address casing', () => {
    vi.mocked(useGetExpensesQuery).mockReturnValue(
      createMockQueryResponse([
        { userAddress: '0xAAA' },
        { userAddress: '0xaaa' },
        { userAddress: '0xBBB' }
      ])
    )
    expect(amountText()).toBe('2')
  })

  it('reports zero when there are no approvals', () => {
    expect(amountText()).toBe('0')
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { zeroAddress } from 'viem'
import { createMockQueryResponse } from '@/tests/mocks'
import { useGetExpensesQuery } from '@/queries/expense.queries'
import MyApprovedExpenseSection from '../MyApprovedExpenseSection.vue'

// mockUserStore.address — the address treated as the current user.
const CURRENT_USER = '0x0000000000000000000000000000000000000001'

const expense = (over: Record<string, unknown> = {}, data: Record<string, unknown> = {}) => ({
  id: 1,
  teamId: 1,
  userAddress: CURRENT_USER,
  signature: '0xsignature',
  status: 'enabled',
  balances: { 0: '0', 1: '5' },
  createdAt: new Date(),
  updatedAt: new Date(),
  data: {
    approvedAddress: CURRENT_USER,
    amount: 100,
    frequencyType: 0,
    customFrequency: 0,
    startDate: 1_700_000_000,
    endDate: 1_800_000_000,
    tokenAddress: zeroAddress,
    ...data
  },
  ...over
})

const TransferActionStub = {
  name: 'TransferAction',
  props: ['row'],
  template: '<div data-test="transfer-action" />'
}

const createWrapper = () =>
  mount(MyApprovedExpenseSection, {
    global: { stubs: { TransferAction: TransferActionStub } }
  })

describe('MyApprovedExpenseSection', () => {
  beforeEach(() => {
    vi.mocked(useGetExpensesQuery).mockReturnValue(createMockQueryResponse([]))
  })

  it('renders a row only for the current user approvals', () => {
    vi.mocked(useGetExpensesQuery).mockReturnValue(
      createMockQueryResponse([
        expense({ signature: '0xa' }, { frequencyType: 0 }),
        expense({ signature: '0xb' }, { frequencyType: 4, customFrequency: 7 }),
        expense({ signature: '0xc', userAddress: '0xother' }, { approvedAddress: '0xother' })
      ])
    )
    const wrapper = createWrapper()
    expect(wrapper.findAll('[data-test="transfer-action"]')).toHaveLength(2)
    expect(wrapper.find('[data-test="my-expenses-empty"]').exists()).toBe(false)
  })

  it('shows an empty state when the user has no approvals', () => {
    expect(createWrapper().find('[data-test="my-expenses-empty"]').exists()).toBe(true)
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createMockQueryResponse } from '@/tests/mocks'
import { useGetExpensesQuery } from '@/queries/expense.queries'

// UTable is auto-imported by @nuxt/ui/vite, so config.global.stubs cannot catch
// it — the module itself must be mocked. The stub exposes the row count and the
// empty slot so the section can be asserted without reaching component internals.
vi.mock('@nuxt/ui/components/Table.vue', () => ({
  default: {
    name: 'UTable',
    props: { data: { type: Array, required: false } },
    template:
      '<div><span data-test="row-count">{{ data ? data.length : 0 }}</span>' +
      '<slot name="empty" v-if="!data || data.length === 0" /></div>'
  }
}))

import MyApprovedExpenseSection from '../MyApprovedExpenseSection.vue'

// mockUserStore.address — the address treated as the current user.
const CURRENT_USER = '0x0000000000000000000000000000000000000001'

const createWrapper = () =>
  mount(MyApprovedExpenseSection, {
    global: { stubs: { TransferAction: true } }
  })

describe('MyApprovedExpenseSection', () => {
  beforeEach(() => {
    vi.mocked(useGetExpensesQuery).mockReturnValue(createMockQueryResponse([]))
  })

  it('keeps only the current user approvals', () => {
    vi.mocked(useGetExpensesQuery).mockReturnValue(
      createMockQueryResponse([
        { data: { approvedAddress: CURRENT_USER } },
        { data: { approvedAddress: '0x00000000000000000000000000000000000000ff' } }
      ])
    )
    expect(createWrapper().find('[data-test="row-count"]').text()).toBe('1')
  })

  it('shows an empty state when the user has no approvals', () => {
    expect(createWrapper().find('[data-test="my-expenses-empty"]').exists()).toBe(true)
  })
})

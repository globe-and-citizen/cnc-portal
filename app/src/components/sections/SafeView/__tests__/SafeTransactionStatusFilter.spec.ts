import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SafeTransactionStatusFilter from '../SafeTransactionStatusFilter.vue'
import type { SafeTransactionFilterCounts } from '@/utils/safeTransactionState'

const counts: SafeTransactionFilterCounts = {
  all: 12,
  'needs-action': 5,
  pending: 3,
  ready: 1,
  conflicting: 1,
  executed: 6,
  invalid: 1
}

describe('SafeTransactionStatusFilter', () => {
  it('prioritizes transactions that need action by default', () => {
    const wrapper = mount(SafeTransactionStatusFilter, { props: { counts } })

    expect(
      wrapper.get('[data-test="safe-transaction-filter-needs-action"]').attributes('aria-pressed')
    ).toBe('true')
    expect(wrapper.get('[data-test="safe-transaction-filter-needs-action"]').text()).toContain('5')
    expect(
      wrapper.get('[data-test="safe-transaction-filter-all"]').attributes('aria-pressed')
    ).toBe('false')
  })

  it('announces counts and emits the filter selected by the user', async () => {
    const wrapper = mount(SafeTransactionStatusFilter, {
      props: { counts, modelValue: 'pending' }
    })
    const readyFilter = wrapper.get('[data-test="safe-transaction-filter-ready"]')

    expect(readyFilter.attributes('aria-label')).toBe('Ready: 1 transaction')

    await readyFilter.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['ready']])
    expect(wrapper.emitted('statusChange')).toEqual([['ready']])
  })
})

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SafeTransactionFeedback from '../SafeTransactionFeedback.vue'

const defaultProps = {
  hasError: false,
  isLoading: false,
  isEmpty: false,
  selectedStatus: 'needs-action' as const,
  emptyDescription: 'Everything is complete for now.'
}

describe('SafeTransactionFeedback', () => {
  it('renders a compact retryable queue error', async () => {
    const wrapper = mount(SafeTransactionFeedback, {
      props: { ...defaultProps, hasError: true }
    })

    const error = wrapper.get('[data-test="safe-transactions-error"]')
    expect(error.attributes('role')).toBe('alert')
    expect(error.text()).toContain('Approval queue unavailable')

    await wrapper.get('[data-test="retry-safe-transactions-button"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('offers the full history when no transaction needs action', async () => {
    const wrapper = mount(SafeTransactionFeedback, {
      props: { ...defaultProps, isEmpty: true }
    })

    expect(wrapper.get('[data-test="safe-transactions-empty"]').text()).toContain(
      'No transactions need action'
    )

    await wrapper.get('[data-test="clear-safe-transaction-filter"]').trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })
})

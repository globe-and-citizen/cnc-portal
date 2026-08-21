import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SafeTransactionActions from '../SafeTransactionActions.vue'

const defaultProps = {
  canApprove: true,
  canExecute: false,
  approveHint: 'Add your signer approval to this transaction.',
  executeHint: 'Wait for the remaining signer approvals before executing.'
}

describe('SafeTransactionActions', () => {
  it('shows only the signer actions currently available', () => {
    const wrapper = mount(SafeTransactionActions, { props: defaultProps })

    expect(wrapper.get('[data-test="approve-button"]').attributes('title')).toBe(
      defaultProps.approveHint
    )
    expect(wrapper.find('[data-test="execute-button"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="view-details-button"]').exists()).toBe(true)
  })

  it('emits the keyboard-reachable action selected by the user', async () => {
    const wrapper = mount(SafeTransactionActions, {
      props: { ...defaultProps, canExecute: true }
    })

    await wrapper.get('[data-test="view-details-button"]').trigger('click')
    await wrapper.get('[data-test="approve-button"]').trigger('click')
    await wrapper.get('[data-test="execute-button"]').trigger('click')

    expect(wrapper.emitted('view')).toHaveLength(1)
    expect(wrapper.emitted('approve')).toHaveLength(1)
    expect(wrapper.emitted('execute')).toHaveLength(1)
  })

  it('locks every signer action while another mutation is pending', () => {
    const wrapper = mount(SafeTransactionActions, {
      props: { ...defaultProps, canExecute: true, actionsDisabled: true }
    })

    expect(wrapper.get('[data-test="approve-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="execute-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="view-details-button"]').attributes('disabled')).toBeUndefined()
  })

  it('keeps unavailable signer actions out of a read-only row', () => {
    const wrapper = mount(SafeTransactionActions, {
      props: { ...defaultProps, canApprove: false }
    })

    expect(wrapper.find('[data-test="approve-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="execute-button"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="view-details-button"]').exists()).toBe(true)
  })
})

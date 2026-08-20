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
  it('exposes permission explanations on signer actions', () => {
    const wrapper = mount(SafeTransactionActions, { props: defaultProps })

    expect(wrapper.get('[data-test="approve-button"]').attributes('title')).toBe(
      defaultProps.approveHint
    )
    expect(wrapper.get('[data-test="execute-button"]').attributes('title')).toBe(
      defaultProps.executeHint
    )
    expect(wrapper.get('[data-test="execute-button"]').attributes('disabled')).toBeDefined()
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
})

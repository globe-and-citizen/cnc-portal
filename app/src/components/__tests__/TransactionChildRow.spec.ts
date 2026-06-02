import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import TransactionChildRow from '../TransactionChildRow.vue'

const UserComponentStub = defineComponent({
  name: 'UserComponent',
  props: {
    user: { type: Object, required: false },
    compact: { type: Boolean, required: false }
  },
  template: '<div data-test="user-component-stub" />'
})

const mountComponent = (
  amount: string | number,
  token: string,
  extra: Partial<{ reason: string; parentAmount: string | number }> = {}
) =>
  mount(TransactionChildRow, {
    props: {
      type: 'transfer',
      otherAddress: '0x1111111111111111111111111111111111111111',
      amount,
      token,
      ...extra
    },
    global: {
      stubs: {
        UserComponent: UserComponentStub
      }
    }
  })

describe('TransactionChildRow', () => {
  it('renders friendly label instead of raw type key', () => {
    const wrapper = mountComponent('10', 'USDC')

    expect(wrapper.text()).toContain('Transfer')
    expect(wrapper.text()).not.toContain('transfer')
  })

  it('renders formatted amount when amount is positive and token is not placeholder', () => {
    const wrapper = mountComponent('10', 'USDC')

    expect(wrapper.text()).toContain('Transfer')
    expect(wrapper.text()).toContain('USDC')
  })

  it('hides amount when amount is zero', () => {
    const wrapper = mountComponent('0', 'USDC')

    expect(wrapper.text()).toContain('Transfer')
    expect(wrapper.text()).not.toContain('USDC')
  })

  it('hides amount when token is placeholder', () => {
    const wrapper = mountComponent('10', '-')

    expect(wrapper.text()).toContain('Transfer')
    expect(wrapper.text()).not.toContain('·')
  })

  it('renders percentage when parentAmount is provided', () => {
    const wrapper = mountComponent('25', 'USDC', { parentAmount: '100' })

    expect(wrapper.text()).toContain('25.00%')
  })

  it('does not render percentage when parentAmount is zero', () => {
    const wrapper = mountComponent('25', 'USDC', { parentAmount: '0' })

    expect(wrapper.text()).not.toContain('%')
  })

  it('renders reason when provided', () => {
    const wrapper = mountComponent('10', 'USDC', { reason: 'bonus' })

    expect(wrapper.text()).toContain('(bonus)')
  })
})

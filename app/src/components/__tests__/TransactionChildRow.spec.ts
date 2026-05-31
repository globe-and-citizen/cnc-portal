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

const mountComponent = (amount: string | number, token: string) =>
  mount(TransactionChildRow, {
    props: {
      type: 'transfer',
      otherAddress: '0x1111111111111111111111111111111111111111',
      amount,
      token
    },
    global: {
      stubs: {
        UserComponent: UserComponentStub
      }
    }
  })

describe('TransactionChildRow', () => {
  it('renders formatted amount when amount is positive and token is not placeholder', () => {
    const wrapper = mountComponent('10', 'USDC')

    expect(wrapper.text()).toContain('transfer')
    expect(wrapper.text()).toContain('USDC')
  })

  it('hides amount when amount is zero', () => {
    const wrapper = mountComponent('0', 'USDC')

    expect(wrapper.text()).toContain('transfer')
    expect(wrapper.text()).not.toContain('USDC')
  })

  it('hides amount when token is placeholder', () => {
    const wrapper = mountComponent('10', '-')

    expect(wrapper.text()).toContain('transfer')
    expect(wrapper.text()).not.toContain('·')
  })
})

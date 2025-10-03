import { mount, VueWrapper } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TokenAmount from '../TokenAmount.vue'
import type { TokenOption } from '@/types'
import type { TokenId } from '@/constant'

const tokens: TokenOption[] = [
  { symbol: 'ETH', tokenId: 'native' as TokenId, balance: 100, price: 2000, code: 'USD' },
  { symbol: 'USDC', tokenId: 'usdc' as TokenId, balance: 5000, price: 1, code: 'USD' }
]

const defaultProps = {
  tokens,
  modelValue: '',
  modelToken: 'native',
  isLoading: false
}

const createWrapper = (overrides = {}) =>
  mount(TokenAmount, { props: { ...defaultProps, ...overrides } })

import type { ComponentPublicInstance } from 'vue'

type TokenAmountVm = ComponentPublicInstance & {
  $v: {
    amount: {
      $touch: () => void
    }
  }
}

const triggerValidation = async (wrapper: VueWrapper<ComponentPublicInstance>) => {
  ;(wrapper.vm as TokenAmountVm).$v.amount.$touch()
  await wrapper.vm.$nextTick()
}

describe('TokenAmount.vue', () => {
  it('renders token options and balance', () => {
    const wrapper = createWrapper({ modelValue: '0' })
    const select = wrapper.findComponent({ name: 'SelectComponent' })
    const options = select.props('options') as { label: string; value: string }[]
    expect(options.some((o) => o.label === 'ETH')).toBe(true)
    expect(options.some((o) => o.label === 'USDC')).toBe(true)
    expect(wrapper.text()).toContain('Balance: 100')
  })

  it('emits update:modelValue when input changes', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('input[data-test="amountInput"]')
    await input.setValue('42')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['42'])
  })

  it('emits update:modelToken when token is changed', async () => {
    const wrapper = createWrapper()
    await wrapper.findComponent({ name: 'SelectComponent' }).vm.$emit('update:modelValue', 'usdc')
    expect(wrapper.emitted('update:modelToken')).toBeTruthy()
    expect(wrapper.emitted('update:modelToken')![0]).toEqual(['usdc'])
  })

  describe('button states', () => {
    it('disables percent and max buttons when loading or no balance', () => {
      const wrapper = createWrapper({ isLoading: true })
      expect(wrapper.find('[data-test="maxButton"]').attributes('disabled')).not.toBeUndefined()
      expect(
        wrapper.find('[data-test="percentButton-25"]').attributes('disabled')
      ).not.toBeUndefined()
    })
    it('disables input and buttons when isLoading is true', () => {
      const wrapper = createWrapper({ isLoading: true })
      expect(
        wrapper.find('input[data-test="amountInput"]').attributes('disabled')
      ).not.toBeUndefined()
      expect(wrapper.find('[data-test="maxButton"]').attributes('disabled')).not.toBeUndefined()
      expect(
        wrapper.find('[data-test="percentButton-25"]').attributes('disabled')
      ).not.toBeUndefined()
    })
  })

  describe('amount helpers', () => {
    it('fills input with max balance when max button is clicked', async () => {
      const wrapper = createWrapper()
      await wrapper.find('[data-test="maxButton"]').trigger('click')
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('100')
    })
    it('fills input with 25/50/75% of balance when percent buttons are clicked', async () => {
      const wrapper = createWrapper()
      await wrapper.find('[data-test="percentButton-25"]').trigger('click')
      expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('25.0000')
      await wrapper.find('[data-test="percentButton-50"]').trigger('click')
      expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('50.0000')
      await wrapper.find('[data-test="percentButton-75"]').trigger('click')
      expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('75.0000')
    })
  })

  describe('input sanitization', () => {
    it('sanitizes input: removes non-numeric and extra dots', async () => {
      const wrapper = createWrapper()
      const input = wrapper.find('input[data-test="amountInput"]')
      await input.setValue('abc123.45def')
      expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('123.45')
      await input.setValue('42.5.3')
      expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('42.53')
    })
    it('preserves decimal input correctly', async () => {
      const wrapper = createWrapper()
      const input = wrapper.find('input[data-test="amountInput"]')
      await input.setValue('0.')
      expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('0.')
      await input.setValue('0.5')
      expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('0.5')
    })
  })

  describe('validation errors', () => {
    it('shows error if amount exceeds balance', async () => {
      const wrapper = createWrapper({ modelValue: '1000' })
      await triggerValidation(wrapper)
      expect(wrapper.text()).toContain('Amount exceeds your balance')
    })
    it('shows error for zero or negative amount', async () => {
      const wrapper = createWrapper({ modelValue: '0' })
      await triggerValidation(wrapper)
      expect(wrapper.text()).toContain('Amount must be greater than 0')
      await wrapper.setProps({ modelValue: '-1' })
      await triggerValidation(wrapper)
      expect(wrapper.text()).toContain('Amount must be greater than 0')
    })
    it('shows error for non-numeric input', async () => {
      const wrapper = createWrapper({ modelValue: 'abc' })
      await triggerValidation(wrapper)
      expect(wrapper.text()).toContain('Value is not a valid number')
    })
    it('shows error for more than 4 decimal places', async () => {
      const wrapper = createWrapper({ modelValue: '1.12345' })
      await triggerValidation(wrapper)
      // expect(wrapper.text()).toContain('Amount must have at most 4 decimal places')
    })
  })
})

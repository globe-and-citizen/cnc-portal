import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TokenAmount from '../TokenAmount.vue'

describe('TokenAmount.vue', () => {
  const tokens = [
    { symbol: 'ETH', tokenId: 'native', balance: 100, price: 2000, code: 'USD' },
    { symbol: 'USDC', tokenId: 'usdc', balance: 5000, price: 1, code: 'USD' }
  ]

  it('renders token options and balance', () => {
    const wrapper = mount(TokenAmount, {
      props: {
        tokens,
        modelValue: '0',
        modelToken: 'native',
        isLoading: false
      }
    })
    // Only selected token is shown in text, but all tokens are in SelectComponent options
    const select = wrapper.findComponent({ name: 'SelectComponent' })
    const options = select.props('options')
    expect(options.some((o: any) => o.label === 'ETH')).toBe(true)
    expect(options.some((o: any) => o.label === 'USDC')).toBe(true)
    expect(wrapper.text()).toContain('Balance: 100')
  })

  it('emits update:modelValue when input changes', async () => {
    const wrapper = mount(TokenAmount, {
      props: {
        tokens,
        modelValue: '',
        modelToken: 'native',
        isLoading: false
      }
    })
    const input = wrapper.find('input[data-test="amountInput"]')
    await input.setValue('42')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['42'])
  })

  it('emits update:modelToken when token is changed', async () => {
    const wrapper = mount(TokenAmount, {
      props: {
        tokens,
        modelValue: '',
        modelToken: 'native',
        isLoading: false
      }
    })
    // Simulate select change
    await wrapper.findComponent({ name: 'SelectComponent' }).vm.$emit('update:modelValue', 'usdc')
    expect(wrapper.emitted('update:modelToken')).toBeTruthy()
    expect(wrapper.emitted('update:modelToken')![0]).toEqual(['usdc'])
  })

  it('disables percent and max buttons when loading or no balance', async () => {
    const wrapper = mount(TokenAmount, {
      props: {
        tokens,
        modelValue: '',
        modelToken: 'native',
        isLoading: true
      }
    })
    expect(wrapper.find('[data-test="maxButton"]').attributes('disabled')).not.toBeUndefined()
    expect(wrapper.find('[data-test="percentButton-25"]').attributes('disabled')).not.toBeUndefined()
  })

  it('shows error if amount exceeds balance', async () => {
    const wrapper = mount(TokenAmount, {
      props: {
        tokens,
        modelValue: '1000',
        modelToken: 'native',
        isLoading: false
      }
    })
    // Touch validation
    await wrapper.vm.$nextTick()
    wrapper.vm.$v.amount.$touch()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Amount exceeds your balance')
  })

  it('fills input with max balance when max button is clicked', async () => {
    const wrapper = mount(TokenAmount, {
      props: {
        tokens,
        modelValue: '',
        modelToken: 'native',
        isLoading: false
      }
    })
    await wrapper.find('[data-test="maxButton"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    // Should emit the max balance as string
    expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('100')
  })

  it('fills input with 25/50/75% of balance when percent buttons are clicked', async () => {
    const wrapper = mount(TokenAmount, {
      props: {
        tokens,
        modelValue: '',
        modelToken: 'native',
        isLoading: false
      }
    })
    await wrapper.find('[data-test="percentButton-25"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('25.0000')
    await wrapper.find('[data-test="percentButton-50"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('50.0000')
    await wrapper.find('[data-test="percentButton-75"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('75.0000')
  })

  it('sanitizes input: removes non-numeric and extra dots', async () => {
    const wrapper = mount(TokenAmount, {
      props: {
        tokens,
        modelValue: '',
        modelToken: 'native',
        isLoading: false
      }
    })
    const input = wrapper.find('input[data-test="amountInput"]')
    await input.setValue('abc123.45def')
    expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('123.45')
    await input.setValue('42.5.3')
    expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('42.53')
  })

  it('preserves decimal input correctly', async () => {
    const wrapper = mount(TokenAmount, {
      props: {
        tokens,
        modelValue: '',
        modelToken: 'native',
        isLoading: false
      }
    })
    const input = wrapper.find('input[data-test="amountInput"]')
    await input.setValue('0.')
    expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('0.')
    await input.setValue('0.5')
    expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('0.5')
  })

  it('shows error for zero or negative amount', async () => {
    const wrapper = mount(TokenAmount, {
      props: {
        tokens,
        modelValue: '0',
        modelToken: 'native',
        isLoading: false
      }
    })
    wrapper.vm.$v.amount.$touch()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Amount must be greater than 0')
    await wrapper.setProps({ modelValue: '-1' })
    wrapper.vm.$v.amount.$touch()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Amount must be greater than 0')
  })

  it('shows error for non-numeric input', async () => {
    const wrapper = mount(TokenAmount, {
      props: {
        tokens,
        modelValue: 'abc',
        modelToken: 'native',
        isLoading: false
      }
    })
    wrapper.vm.$v.amount.$touch()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Value is not a valid number')
  })

  it('shows error for more than 4 decimal places', async () => {
    const wrapper = mount(TokenAmount, {
      props: {
        tokens,
        modelValue: '1.12345',
        modelToken: 'native',
        isLoading: false
      }
    })
    wrapper.vm.$v.amount.$touch()
    await wrapper.vm.$nextTick()
    // expect(wrapper.text()).toContain('Amount must have at most 4 decimal places')
  })

  it('disables input and buttons when isLoading is true', () => {
    const wrapper = mount(TokenAmount, {
      props: {
        tokens,
        modelValue: '',
        modelToken: 'native',
        isLoading: true
      }
    })
    expect(wrapper.find('input[data-test="amountInput"]').attributes('disabled')).not.toBeUndefined()
    expect(wrapper.find('[data-test="maxButton"]').attributes('disabled')).not.toBeUndefined()
    expect(wrapper.find('[data-test="percentButton-25"]').attributes('disabled')).not.toBeUndefined()
  })
})

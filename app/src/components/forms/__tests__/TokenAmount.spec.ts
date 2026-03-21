import { mount, VueWrapper } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { nextTick, type ComponentPublicInstance } from 'vue'
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

type TokenAmountVm = ComponentPublicInstance & {
  tokenOptions: { label: string; value: string }[]
  selectedTokenId: string
  handleAmountInput: (event: Event) => void
}

const getVm = (wrapper: VueWrapper<ComponentPublicInstance>): TokenAmountVm =>
  wrapper.vm as unknown as TokenAmountVm

const getLastValidation = (wrapper: VueWrapper<ComponentPublicInstance>): boolean | undefined => {
  const emissions = wrapper.emitted('validation')
  if (!emissions || emissions.length === 0) return undefined
  return emissions.at(-1)?.[0] as boolean
}

const makeInputEvent = (value: string): Event => ({
  target: { value }
}) as unknown as Event

describe('TokenAmount.vue', () => {
  it('renders token options and balance', () => {
    const wrapper = createWrapper({ modelValue: '0' })
    const options = getVm(wrapper).tokenOptions

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

    getVm(wrapper).selectedTokenId = 'usdc'
    await nextTick()

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
      expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('100.000000')
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
      const vm = getVm(wrapper)

      vm.handleAmountInput(makeInputEvent('abc123.45def'))
      await nextTick()
      expect(wrapper.emitted('update:modelValue')!.pop()![0]).toBe('123.45')

      vm.handleAmountInput(makeInputEvent('42.5.3'))
      await nextTick()
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
    it('shows invalid validation state for zero or negative amount', async () => {
      const wrapper = createWrapper({ modelValue: '0' })
      expect(getLastValidation(wrapper)).toBe(false)

      await wrapper.setProps({ modelValue: '-1' })
      await nextTick()
      expect(getLastValidation(wrapper)).toBe(false)
    })

    it('shows invalid validation state for non-numeric input', () => {
      const wrapper = createWrapper({ modelValue: 'abc' })
      expect(getLastValidation(wrapper)).toBe(false)
    })

    it('keeps validation valid for more than 4 decimal places', () => {
      const wrapper = createWrapper({ modelValue: '1.12345' })
      expect(getLastValidation(wrapper)).toBe(true)
    })
  })
})

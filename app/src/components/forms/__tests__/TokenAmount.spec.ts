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
  modelValue: { amount: '', tokenId: 'native' },
  isLoading: false
}

const createWrapper = (overrides = {}) =>
  mount(TokenAmount, { props: { ...defaultProps, ...overrides } })

type TokenAmountVm = ComponentPublicInstance & {
  tokenOptions: { label: string; value: string }[]
  selectedTokenId: string
  estimatedPrice: string
  handleTokenSelect: (val: string) => void
  handleAmountInput: (event: Event) => void
  useMaxBalance: () => void
  usePercentageOfBalance: (percentage: number) => void
}

const getVm = (wrapper: VueWrapper<ComponentPublicInstance>): TokenAmountVm =>
  wrapper.vm as unknown as TokenAmountVm

const getLastValidation = (wrapper: VueWrapper<ComponentPublicInstance>): boolean | undefined => {
  const emissions = wrapper.emitted('validation')
  if (!emissions || emissions.length === 0) return undefined
  return emissions[emissions.length - 1]?.[0] as boolean
}

const getLastModelValue = (
  wrapper: VueWrapper<ComponentPublicInstance>
): { amount: string; tokenId: string } | undefined => {
  const emissions = wrapper.emitted('update:modelValue')
  if (!emissions || emissions.length === 0) return undefined
  return emissions[emissions.length - 1]?.[0] as { amount: string; tokenId: string }
}

const makeInputEvent = (value: string): Event =>
  ({
    target: { value }
  }) as unknown as Event

describe('TokenAmount.vue', () => {
  it('renders token options and balance', () => {
    const wrapper = createWrapper({ modelValue: { amount: '0', tokenId: 'native' } })
    const options = getVm(wrapper).tokenOptions

    expect(options.some((o) => o.label === 'ETH')).toBe(true)
    expect(options.some((o) => o.label === 'USDC')).toBe(true)
    expect(wrapper.text()).toContain('Balance: 100')
  })

  it('emits update:modelValue object when input changes', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('input[data-test="amountInput"]')
    await input.setValue('42')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([{ amount: '42', tokenId: 'native' }])
  })

  it('emits update:modelValue object when token is changed', async () => {
    const wrapper = createWrapper()

    getVm(wrapper).selectedTokenId = 'usdc'
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([{ amount: '', tokenId: 'usdc' }])
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

    it('disables token select when there is only one option', () => {
      const wrapper = createWrapper({
        tokens: [
          { symbol: 'USDC', tokenId: 'usdc' as TokenId, balance: 10, price: 1, code: 'USD' }
        ],
        modelValue: { amount: '', tokenId: 'usdc' as TokenId }
      })

      expect(wrapper.find('[data-test="tokenSelect"]').attributes('disabled')).not.toBeUndefined()
    })
  })

  describe('amount helpers', () => {
    it('fills input with max balance when max button is clicked', async () => {
      const wrapper = createWrapper()
      await wrapper.find('[data-test="maxButton"]').trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(getLastModelValue(wrapper)?.amount).toBe('100.000000')
      expect(getLastModelValue(wrapper)?.tokenId).toBe('native')
    })

    it('fills input with 25/50/75% of balance when percent buttons are clicked', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="percentButton-25"]').trigger('click')
      expect(getLastModelValue(wrapper)?.amount).toBe('25.0000')

      await wrapper.find('[data-test="percentButton-50"]').trigger('click')
      expect(getLastModelValue(wrapper)?.amount).toBe('50.0000')

      await wrapper.find('[data-test="percentButton-75"]').trigger('click')
      expect(getLastModelValue(wrapper)?.amount).toBe('75.0000')
    })

    it('uses spendableBalance for max balance when present', async () => {
      const wrapper = createWrapper({
        tokens: [
          {
            symbol: 'ETH',
            tokenId: 'native' as TokenId,
            balance: 100,
            spendableBalance: 40,
            price: 2000,
            code: 'USD'
          }
        ]
      })

      await wrapper.find('[data-test="maxButton"]').trigger('click')

      expect(getLastModelValue(wrapper)?.amount).toBe('40.000000')
    })

    it('should apply feeBps to max balance when fee is configured', async () => {
      const wrapper = createWrapper({ feeBps: 100 })

      await wrapper.find('[data-test="maxButton"]').trigger('click')

      expect(getLastModelValue(wrapper)?.amount).toBe('99.000000')
    })
  })

  describe('input sanitization', () => {
    it('should sanitize input: removes non-numeric and extra dots', async () => {
      const wrapper = createWrapper()
      const vm = getVm(wrapper)

      vm.handleAmountInput(makeInputEvent('abc123.45def'))
      await nextTick()
      expect(getLastModelValue(wrapper)?.amount).toBe('123.45')

      vm.handleAmountInput(makeInputEvent('42.5.3'))
      await nextTick()
      expect(getLastModelValue(wrapper)?.amount).toBe('42.53')
    })

    it('should preserve decimal input correctly', async () => {
      const wrapper = createWrapper()
      const input = wrapper.find('input[data-test="amountInput"]')

      await input.setValue('0.')
      expect(getLastModelValue(wrapper)?.amount).toBe('0.')

      await input.setValue('0.5')
      expect(getLastModelValue(wrapper)?.amount).toBe('0.5')
    })
  })

  describe('validation errors', () => {
    it('should show invalid validation state for zero or negative amount', async () => {
      const wrapper = createWrapper({ modelValue: { amount: '0', tokenId: 'native' } })
      expect(getLastValidation(wrapper)).toBe(false)

      await wrapper.setProps({ modelValue: { amount: '-1', tokenId: 'native' } })
      await nextTick()
      expect(getLastValidation(wrapper)).toBe(false)
    })

    it('shows invalid validation state for non-numeric input', () => {
      const wrapper = createWrapper({ modelValue: { amount: 'abc', tokenId: 'native' } })
      expect(getLastValidation(wrapper)).toBe(false)
    })

    it('keeps validation valid for more than 4 decimal places', () => {
      const wrapper = createWrapper({ modelValue: { amount: '1.12345', tokenId: 'native' } })
      expect(getLastValidation(wrapper)).toBe(true)
    })

    it('shows invalid validation state when amount exceeds balance', async () => {
      const wrapper = createWrapper({ modelValue: { amount: '999', tokenId: 'native' } })

      await nextTick()

      expect(getLastValidation(wrapper)).toBe(false)
    })
  })

  describe('fallback behavior', () => {
    it('falls back to native tokenId when modelValue.tokenId is missing on amount input', async () => {
      const wrapper = createWrapper({
        modelValue: { amount: '' } as { amount: string; tokenId: TokenId }
      })
      const input = wrapper.find('input[data-test="amountInput"]')

      await input.setValue('5')

      expect(getLastModelValue(wrapper)?.tokenId).toBe('native')
      expect(getLastModelValue(wrapper)?.amount).toBe('5')
    })

    it('falls back to empty amount when modelValue.amount is missing and token changes', async () => {
      const wrapper = createWrapper({
        modelValue: { tokenId: 'native' } as { amount: string; tokenId: TokenId }
      })

      getVm(wrapper).selectedTokenId = 'usdc'
      await nextTick()

      expect(getLastModelValue(wrapper)?.amount).toBe('')
      expect(getLastModelValue(wrapper)?.tokenId).toBe('usdc')
    })
  })

  describe('estimated price', () => {
    it('should use fallback currency code and zero amount conversion when values are missing', () => {
      localStorage.setItem('currency', JSON.stringify({ name: 'No code currency' }))

      const wrapper = createWrapper({
        modelValue: { amount: '', tokenId: 'native' }
      })

      expect(getVm(wrapper).estimatedPrice).toBe('$0')
    })

    it('should use zero price fallback when selected token is not found', () => {
      localStorage.removeItem('currency')

      const wrapper = createWrapper({
        modelValue: { amount: '1', tokenId: 'missing-token' as TokenId }
      })

      expect(getVm(wrapper).estimatedPrice).toBe('$0')
    })
  })
})

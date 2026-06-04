import { mount, type VueWrapper } from '@vue/test-utils'
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
  modelValue: { amount: '', tokenId: 'native' as TokenId },
  isLoading: false
}

const createWrapper = (overrides: Record<string, unknown> = {}) =>
  mount(TokenAmount, { props: { ...defaultProps, ...overrides } })

const lastEmitted = <T>(
  wrapper: VueWrapper<ComponentPublicInstance>,
  event: string
): T | undefined => {
  const emissions = wrapper.emitted(event)
  if (!emissions || emissions.length === 0) return undefined
  return emissions[emissions.length - 1]?.[0] as T
}

const lastValidation = (wrapper: VueWrapper<ComponentPublicInstance>) =>
  lastEmitted<boolean>(wrapper, 'validation')

const lastModelValue = (wrapper: VueWrapper<ComponentPublicInstance>) =>
  lastEmitted<{ amount: string; tokenId: string }>(wrapper, 'update:modelValue')

// USelect (Nuxt UI) renders a button trigger, not a native <select>, so we drive its
// v-model through the component contract instead of dispatching a DOM event.
const findTokenSelect = (wrapper: VueWrapper<ComponentPublicInstance>) =>
  wrapper.findComponent({ name: 'Select' })

const selectToken = (
  wrapper: VueWrapper<ComponentPublicInstance>,
  tokenId: string
): Promise<void> => findTokenSelect(wrapper).setValue(tokenId)

describe('TokenAmount.vue', () => {
  it('renders the available token options and balance', () => {
    const wrapper = createWrapper({ modelValue: { amount: '0', tokenId: 'native' } })

    expect(findTokenSelect(wrapper).props('items')).toEqual([
      { label: 'ETH', value: 'native' },
      { label: 'USDC', value: 'usdc' }
    ])
    expect(wrapper.text()).toContain('Balance: 100')
  })

  it('emits update:modelValue object when input changes', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('input[data-test="amountInput"]')
    await input.setValue('42')

    expect(lastModelValue(wrapper)).toEqual({ amount: '42', tokenId: 'native' })
  })

  it('emits update:modelValue object when token is changed', async () => {
    const wrapper = createWrapper()

    await selectToken(wrapper, 'usdc')
    await nextTick()

    expect(lastModelValue(wrapper)).toEqual({ amount: '', tokenId: 'usdc' })
  })

  describe('button states', () => {
    it('disables percent and max buttons when loading', () => {
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

      expect(lastModelValue(wrapper)).toEqual({ amount: '100.000000', tokenId: 'native' })
    })

    it('fills input with 25/50/75% of balance when percent buttons are clicked', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="percentButton-25"]').trigger('click')
      expect(lastModelValue(wrapper)?.amount).toBe('25.0000')

      await wrapper.find('[data-test="percentButton-50"]').trigger('click')
      expect(lastModelValue(wrapper)?.amount).toBe('50.0000')

      await wrapper.find('[data-test="percentButton-75"]').trigger('click')
      expect(lastModelValue(wrapper)?.amount).toBe('75.0000')
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

      expect(lastModelValue(wrapper)?.amount).toBe('40.000000')
    })

    it('applies feeBps to max balance when fee is configured', async () => {
      const wrapper = createWrapper({ feeBps: 100 })

      await wrapper.find('[data-test="maxButton"]').trigger('click')

      expect(lastModelValue(wrapper)?.amount).toBe('99.000000')
    })
  })

  describe('input sanitization', () => {
    // The handler emits update:modelValue with the sanitized amount alongside UInput's
    // own raw emission, so we assert it appears in the emission stream rather than as
    // the last value (UInput emits after the @input handler in the same tick).
    it('removes non-numeric characters from input', async () => {
      const wrapper = createWrapper()
      await wrapper.find('input[data-test="amountInput"]').setValue('abc123.45def')

      expect(wrapper.emitted('update:modelValue')).toContainEqual([
        { amount: '123.45', tokenId: 'native' }
      ])
    })

    it('collapses multiple decimal points to a single one', async () => {
      const wrapper = createWrapper()
      await wrapper.find('input[data-test="amountInput"]').setValue('42.5.3')

      expect(wrapper.emitted('update:modelValue')).toContainEqual([
        { amount: '42.53', tokenId: 'native' }
      ])
    })

    it('preserves decimal input correctly', async () => {
      const wrapper = createWrapper()
      const input = wrapper.find('input[data-test="amountInput"]')

      await input.setValue('0.')
      expect(wrapper.emitted('update:modelValue')).toContainEqual([
        { amount: '0.', tokenId: 'native' }
      ])

      await input.setValue('0.5')
      expect(wrapper.emitted('update:modelValue')).toContainEqual([
        { amount: '0.5', tokenId: 'native' }
      ])
    })
  })

  describe('validation errors', () => {
    it('emits invalid validation for zero or negative amount', async () => {
      const wrapper = createWrapper({ modelValue: { amount: '0', tokenId: 'native' } })
      expect(lastValidation(wrapper)).toBe(false)

      await wrapper.setProps({ modelValue: { amount: '-1', tokenId: 'native' } })
      await nextTick()
      expect(lastValidation(wrapper)).toBe(false)
    })

    it('emits invalid validation for non-numeric input', () => {
      const wrapper = createWrapper({ modelValue: { amount: 'abc', tokenId: 'native' } })
      expect(lastValidation(wrapper)).toBe(false)
    })

    it('emits valid validation for amounts with more than 4 decimal places', () => {
      const wrapper = createWrapper({ modelValue: { amount: '1.12345', tokenId: 'native' } })
      expect(lastValidation(wrapper)).toBe(true)
    })

    it('emits invalid validation when amount exceeds balance', async () => {
      const wrapper = createWrapper({ modelValue: { amount: '999', tokenId: 'native' } })
      await nextTick()
      expect(lastValidation(wrapper)).toBe(false)
    })
  })

  describe('fallback behavior', () => {
    it('falls back to native tokenId when modelValue.tokenId is missing on amount input', async () => {
      const wrapper = createWrapper({
        modelValue: { amount: '' } as { amount: string; tokenId: TokenId }
      })

      await wrapper.find('input[data-test="amountInput"]').setValue('5')

      expect(lastModelValue(wrapper)).toEqual({ amount: '5', tokenId: 'native' })
    })

    it('falls back to empty amount when modelValue.amount is missing and token changes', async () => {
      const wrapper = createWrapper({
        modelValue: { tokenId: 'native' } as { amount: string; tokenId: TokenId }
      })

      await selectToken(wrapper, 'usdc')
      await nextTick()

      expect(lastModelValue(wrapper)).toEqual({ amount: '', tokenId: 'usdc' })
    })
  })

  describe('estimated price', () => {
    it('formats estimated price using USD fallback when currency lacks code', () => {
      localStorage.setItem('currency', JSON.stringify({ name: 'No code currency' }))

      const wrapper = createWrapper({ modelValue: { amount: '0.5', tokenId: 'native' } })

      // 0.5 * 2000 = 1000 → '$1K' (USD fallback applied because currency.code is missing)
      expect(wrapper.text()).toContain('$1K')
    })

    it('shows $0 estimated price when selected token is not found', () => {
      localStorage.removeItem('currency')

      const wrapper = createWrapper({
        modelValue: { amount: '1', tokenId: 'missing-token' as TokenId }
      })

      expect(wrapper.text()).toContain('≈ $0')
    })
  })
})

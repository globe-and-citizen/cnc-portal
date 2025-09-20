import { it, expect, describe, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TransferForm from '../TransferForm.vue'
import { NETWORK, type TokenId } from '@/constant'
import { createTestingPinia } from '@pinia/testing'
import SelectMemberContractsInput from '@/components/utils/SelectMemberContractsInput.vue'
import { mockUseCurrencyStore } from '@/tests/mocks/index.mock'
import type { TokenOption } from '@/types'

vi.mock('@/stores/currencyStore', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCurrencyStore: vi.fn(() => ({ ...mockUseCurrencyStore() }))
  }
})
const defaultTokens: TokenOption[] = [
  { symbol: NETWORK.currencySymbol, balance: 100, tokenId: 'native' as TokenId, price: 2000, code: 'USD' },
  { symbol: 'USDC', balance: 50, tokenId: 'usdc' as TokenId, price: 1, code: 'USD' }
]
const defaultModelValue = {
  address: { name: '', address: '' },
  token: { symbol: NETWORK.currencySymbol, balance: 100, tokenId: 'native' as TokenId, price: 2000, code: 'USD' },
  amount: '0'
}

const defaultProps = {
  loading: false,
  service: 'Test Service',
  tokens: defaultTokens,
  modelValue: defaultModelValue
}
function factory(props = {}) {
  return mount(TransferForm, {
    props: { ...defaultProps, ...props },
    global: {
      stubs: { SelectMemberInput: true },
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })
}

describe('TransferForm.vue', () => {
  let wrapper: ReturnType<typeof mount<typeof TransferForm>>
  beforeEach(() => {
    wrapper = factory()
  })

  describe('Renders', () => {
    it('renders SelectMemberInput component', () => {
      expect(wrapper.findComponent(SelectMemberContractsInput).exists()).toBe(true)
    })
  })

  describe('Actions', () => {
    it('emits closeModal event when Cancel button is clicked', async () => {
      const cancelButton = wrapper.find('.btn-error')
      await cancelButton.trigger('click')
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })
  })

  describe.skip('Token Selection', () => {
    it('opens and closes the token dropdown', async () => {
      const dropdownButton = wrapper.find('.badge-info')
      await dropdownButton.trigger('click')
      expect(wrapper.find('[data-test="token-dropdown"]').isVisible()).toBe(true)

      await dropdownButton.trigger('click')
      expect(wrapper.find('[data-test="token-dropdown"]').exists()).toBe(false)
    })
  })

  describe.skip('Amount Input Handling', () => {
    let amountInput: ReturnType<typeof wrapper.find>

    beforeEach(() => {
      amountInput = wrapper.find('[data-test="amount-input"]')
    })

    it('accepts valid numeric input', async () => {
      await amountInput.setValue('42')
      expect(wrapper.props('modelValue').amount).toBe('42')

      await amountInput.setValue('42.5')
      expect(wrapper.props('modelValue').amount).toBe('42.5')
    })

    it('handles multiple decimal points', async () => {
      await amountInput.setValue('42.5.3')
      expect(wrapper.props('modelValue').amount).toBe('42.53')
    })

    it('removes non-numeric characters', async () => {
      await amountInput.setValue('abc123.45def')
      expect(wrapper.props('modelValue').amount).toBe('123.45')

      await amountInput.setValue('!@#50.75$%^')
      expect(wrapper.props('modelValue').amount).toBe('50.75')
    })

    it('preserves decimal input correctly', async () => {
      await amountInput.setValue('0.')
      expect(wrapper.props('modelValue').amount).toBe('0.')

      await amountInput.setValue('0.5')
      expect(wrapper.props('modelValue').amount).toBe('0.5')
    })
  })

  describe.skip('Validation', () => {
    it('shows error when address is empty', async () => {
      const transferButton = wrapper.find('[data-test="transferButton"]')
      await transferButton.trigger('click')

      const errorMessages = wrapper.findAll('.text-red-500')
      expect(errorMessages.length).toBeGreaterThan(0)
      expect(errorMessages.some((el) => el.text().includes('Invalid address'))).toBe(true)
    })

    it('shows error when address is invalid', async () => {
      await wrapper.findComponent(SelectMemberContractsInput).vm.$emit('update:modelValue', {
        name: '',
        address: 'invalid-address'
      })

      const transferButton = wrapper.find('[data-test="transferButton"]')
      await transferButton.trigger('click')

      const errorMessages = wrapper.findAll('.text-red-500')
      expect(errorMessages.some((el) => el.text().includes('Invalid address'))).toBe(true)
    })

    it('shows error when amount is empty', async () => {
      const amountInput = wrapper.find('[data-test="amount-input"]')
      await amountInput.setValue('')

      const transferButton = wrapper.find('[data-test="transferButton"]')
      await transferButton.trigger('click')

      const errorMessages = wrapper.findAll('.text-red-500')
      expect(errorMessages.some((el) => el.text().includes('required'))).toBe(true)
    })

    it('shows error when amount is not numeric', async () => {
      const amountInput = wrapper.find('[data-test="amount-input"]')
      await amountInput.setValue('abc')

      const transferButton = wrapper.find('[data-test="transferButton"]')
      await transferButton.trigger('click')

      const errorMessages = wrapper.findAll('.text-red-500')
      expect(
        errorMessages.some((el) => el.text().includes('Amount exceeds contract balance'))
      ).toBe(true)
    })

    it('shows error when amount is zero', async () => {
      const amountInput = wrapper.find('[data-test="amount-input"]')
      await amountInput.setValue('0')

      const transferButton = wrapper.find('[data-test="transferButton"]')
      await transferButton.trigger('click')

      const errorMessages = wrapper.findAll('.text-red-500')
      expect(errorMessages.some((el) => el.text().includes('Amount must be greater than 0'))).toBe(
        true
      )
    })

    it('shows error when amount exceeds contract balance', async () => {
      const amountInput = wrapper.find('[data-test="amount-input"]')
      await amountInput.setValue('150')

      await wrapper.vm.$nextTick()
      const errorMessages = wrapper.findAll('.text-red-500')
      expect(
        errorMessages.some((el) => el.text().includes('Amount exceeds contract balance'))
      ).toBe(true)
      const transferButton = wrapper.find('[data-test="transferButton"]')
      expect(transferButton.exists()).toBe(true)
    })

    it('sets max amount when Max button is clicked', async () => {
      const maxButton = wrapper.find('[data-test="max-button"]')
      await maxButton.trigger('click')
      await wrapper.vm.$nextTick()

      const amountInput = wrapper.find('[data-test="amount-input"]')
      expect((amountInput.element as HTMLInputElement).value).toBe('100')
    })

    it('validates amount in real-time as it changes', async () => {
      const amountInput = wrapper.find('[data-test="amount-input"]')

      await amountInput.setValue('50')
      await wrapper.vm.$nextTick()
      const validTransferButton = wrapper.find('[data-test="transferButton"]')
      expect(validTransferButton.exists()).toBe(true)

      await amountInput.setValue('150')
      await wrapper.vm.$nextTick()
      const errorMessages = wrapper.findAll('.text-red-500')
      expect(errorMessages.length).toBeGreaterThan(0)
      expect(
        errorMessages.some((el) => el.text().includes('Amount exceeds contract balance'))
      ).toBe(true)
    })

    describe('Percentage Buttons', () => {
      it('correctly sets 25% of balance when clicking 25% button', async () => {
        const percentButton = wrapper.find('[data-test="percentButton-25"]')
        await percentButton.trigger('click')
        const amountInput = wrapper.find('[data-test="amount-input"]')
        expect((amountInput.element as HTMLInputElement).value).toBe('25.0000')
      })

      it('correctly sets 50% of balance when clicking 50% button', async () => {
        const percentButton = wrapper.find('[data-test="percentButton-50"]')
        await percentButton.trigger('click')
        const amountInput = wrapper.find('[data-test="amount-input"]')
        expect((amountInput.element as HTMLInputElement).value).toBe('50.0000')
      })

      it('correctly sets 75% of balance when clicking 75% button', async () => {
        const percentButton = wrapper.find('[data-test="percentButton-75"]')
        await percentButton.trigger('click')
        const amountInput = wrapper.find('[data-test="amount-input"]')
        expect((amountInput.element as HTMLInputElement).value).toBe('75.0000')
      })

      it('validates percentage amounts correctly', async () => {
        const percentButton = wrapper.find('[data-test="percentButton-50"]')
        await percentButton.trigger('click')
        await wrapper.vm.$nextTick()

        const errorMessages = wrapper.findAll('.text-red-500')
        expect(errorMessages.length).toBe(0) // Should be valid as 50% of 100 is within balance
      })

      it('updates formatted amount when using percentage buttons', async () => {
        const percentButton = wrapper.find('[data-test="percentButton-50"]')
        await percentButton.trigger('click')
        await wrapper.vm.$nextTick()

        const formattedAmount = wrapper.find('.text-sm.text-gray-500')
        expect(formattedAmount.exists()).toBe(true)
      })
    })
    it('emits transfer event when form is valid', async () => {
      await wrapper.findComponent(SelectMemberContractsInput).vm.$emit('update:modelValue', {
        name: 'Test',
        address: '0x1234567890123456789012345678901234567890'
      })

      const amountInput = wrapper.find('[data-test="amount-input"]')
      await amountInput.setValue('10')

      const transferButton = wrapper.find('[data-test="transferButton"]')
      await transferButton.trigger('click')

      expect(wrapper.emitted('transfer')).toBeTruthy()
      const emitted = wrapper.emitted('transfer')
      expect(emitted).toBeTruthy()
      expect(emitted?.[0]).toMatchObject([
        {
          address: { name: 'Test', address: '0x1234567890123456789012345678901234567890' },
          token: expect.objectContaining(defaultTokens[0]),
          amount: '10'
        }
      ])
    })
  })
})

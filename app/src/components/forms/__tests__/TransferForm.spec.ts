import { it, expect, describe, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TransferForm from '../TransferForm.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { NETWORK } from '@/constant'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { createTestingPinia } from '@pinia/testing'

vi.mock('@/stores', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCurrencyStore: vi.fn(() => ({
      currency: {
        code: 'USD',
        symbol: '$'
      }
    }))
  }
})

describe('TransferForm.vue', () => {
  let wrapper: ReturnType<typeof mount>
  beforeEach(() => {
    wrapper = mount(TransferForm, {
      props: {
        loading: false,
        service: 'Test Service',
        tokens: [
          { symbol: NETWORK.currencySymbol, balance: '100' },
          { symbol: 'USDC', balance: '50' }
        ],
        modelValue: {
          address: { name: '', address: '' },
          token: { symbol: NETWORK.currencySymbol, balance: '100' },
          amount: '0'
        }
      },
      global: {
        stubs: {
          SelectMemberInput: true
        },
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  })

  describe('Renders', () => {
    it('loading button', () => {
      const wrapper = mount(TransferForm, {
        props: {
          loading: true,
          service: 'Test Service',
          tokens: [
            { symbol: NETWORK.currencySymbol, balance: '100' },
            { symbol: 'USDC', balance: '50' }
          ],
          modelValue: {
            address: { name: '', address: '' },
            token: { symbol: NETWORK.currencySymbol, balance: '100' },
            amount: '0'
          }
        },
        global: {
          stubs: {
            SelectMemberInput: true
          }
        }
      })
      expect(wrapper.findComponent(ButtonUI).props().loading).toBe(true)
    })

    it('renders initial UI correctly', () => {
      expect(wrapper.find('h1').text()).toBe('Transfer from Test Service Contract')
      expect(wrapper.find('.btn-primary').text()).toBe('Transfer')
      expect(wrapper.find('.btn-error').text()).toBe('Cancel')
      expect(wrapper.find('[data-test="amount-input"]').exists()).toBe(true)
    })

    it('renders SelectMemberInput component', () => {
      expect(wrapper.findComponent(SelectMemberInput).exists()).toBe(true)
    })
  })

  describe('Actions', () => {
    it('emits closeModal event when Cancel button is clicked', async () => {
      const cancelButton = wrapper.find('.btn-error')
      await cancelButton.trigger('click')
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })
  })

  describe('Token Selection', () => {
    it('opens and closes the token dropdown', async () => {
      const dropdownButton = wrapper.find('.badge-info')
      await dropdownButton.trigger('click')
      expect(wrapper.find('[data-test="token-dropdown"]').isVisible()).toBe(true)

      await dropdownButton.trigger('click')
      expect(wrapper.find('[data-test="token-dropdown"]').exists()).toBe(false)
    })
  })

  describe('Validation', () => {
    it('shows error when address is empty', async () => {
      const transferButton = wrapper.find('[data-test="transferButton"]')
      await transferButton.trigger('click')

      const errorMessages = wrapper.findAll('.text-red-500')
      expect(errorMessages.length).toBeGreaterThan(0)
      expect(errorMessages.some((el) => el.text().includes('Invalid address'))).toBe(true)
    })

    it('shows error when address is invalid', async () => {
      await wrapper.findComponent(SelectMemberInput).vm.$emit('update:modelValue', {
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
      expect(errorMessages.some((el) => el.text().includes('numeric'))).toBe(true)
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

    it('emits transfer event when form is valid', async () => {
      await wrapper.findComponent(SelectMemberInput).vm.$emit('update:modelValue', {
        name: 'Test',
        address: '0x1234567890123456789012345678901234567890'
      })

      const amountInput = wrapper.find('[data-test="amount-input"]')
      await amountInput.setValue('10')

      const transferButton = wrapper.find('[data-test="transferButton"]')
      await transferButton.trigger('click')

      expect(wrapper.emitted('transfer')).toBeTruthy()
      expect(wrapper.emitted('transfer')?.[0]).toEqual([
        {
          address: { name: 'Test', address: '0x1234567890123456789012345678901234567890' },
          token: { symbol: NETWORK.currencySymbol, balance: '100' },
          amount: '10'
        }
      ])
    })
  })
})

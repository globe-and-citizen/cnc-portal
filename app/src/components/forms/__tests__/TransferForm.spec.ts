import { it, expect, describe, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TransferForm from '../TransferForm.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { NETWORK } from '@/constant'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'

interface ComponentData {
  model: {
    address: {
      name: string
      address: string
    }
    token: {
      symbol: string
      balance: string
    }
    amount: string
  }
}

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
        }
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

    it('selects a token from the dropdown', async () => {
      const dropdownButton = wrapper.find('.badge-info')
      await dropdownButton.trigger('click')
      const tokenOption = wrapper.find('[data-test="token-dropdown"] li')
      await tokenOption.trigger('click')
      expect((wrapper.vm as unknown as ComponentData).model.token.symbol).toBe(
        NETWORK.currencySymbol
      )
    })
  })
})

// TransferFromBankForm.spec.ts
import { it, expect, describe, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TransferFromBankForm from '../TransferFromBankForm.vue'
import LoadingButton from '@/components/LoadingButton.vue'

interface ComponentData {
  to: string
  amount: string
}
describe('TransferFromBankForm.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(TransferFromBankForm, {
      props: {
        loading: false,
        bankBalance: '100',
        filteredMembers: [
          { id: '1', name: 'John Doe', address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E' },
          { id: '2', name: 'Jane Smith', address: '0xc542BdA5EC1aC9b86fF470c04062D6a181e67928' }
        ]
      }
    })
  })

  describe('Renders', () => {
    it('loading button', () => {
      const wrapper = mount(TransferFromBankForm, {
        props: {
          loading: true,
          bankBalance: '100',
          filteredMembers: [
            { id: '1', name: 'John Doe', address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E' },
            { id: '2', name: 'Jane Smith', address: '0xc542BdA5EC1aC9b86fF470c04062D6a181e67928' }
          ]
        }
      })
      expect(wrapper.findComponent(LoadingButton).exists()).toBe(true)
    })
    it('renders initial UI correctly', () => {
      expect(wrapper.find('h1').text()).toBe('Transfer from Bank Contract')
      expect(wrapper.find('.btn-primary').text()).toBe('Transfer')
      expect(wrapper.find('.btn-error').text()).toBe('Cancel')
      expect(wrapper.find('.input-md input[type="text"]').element).toBeDefined()
    })

    it('renders input transfer recipient correctly', async () => {
      const recipientInput = wrapper.find('input[data-test="recipient-input"]')
      expect(recipientInput.element).toBeDefined()
      await recipientInput.setValue('0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E')

      expect((wrapper.vm as unknown as ComponentData).to).toBe(
        '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E'
      )
    })

    it('renders input transfer amount correctly', async () => {
      const amountInput = wrapper.find('input[data-test="amount-input"]')
      expect(amountInput.element).toBeDefined()
      await amountInput.setValue('10')

      expect((wrapper.vm as unknown as ComponentData).amount).toBe('10')
    })
  })

  describe('Actions', () => {
    it('updates "to" value when selecting member from dropdown', async () => {
      const dropdownOption = wrapper.find('.dropdown-content a')
      await dropdownOption.trigger('click')
      expect((wrapper.vm as unknown as ComponentData).to).toBe(
        '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E'
      )
    })

    it('emits closeModal event when Cancel button is clicked', async () => {
      const cancelButton = wrapper.find('.btn-error')
      await cancelButton.trigger('click')
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })
    it('emits transfer event when Transfer button is clicked', async () => {
      const recipientInput = wrapper.find('input[data-test="recipient-input"]')
      await recipientInput.setValue('0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E')

      const amountInput = wrapper.find('input[data-test="amount-input"]')
      await amountInput.setValue(10)

      await wrapper.find('button[data-test="transferButton"]').trigger('click')

      expect(wrapper.emitted('transfer')).toBeTruthy()
    })
  })
  describe('form validation', () => {
    it('shows error when amount is 0', async () => {
      const wrapper = mount(TransferFromBankForm, {
        props: {
          loading: false,
          bankBalance: '100',
          filteredMembers: [
            { id: '1', name: 'John Doe', address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E' },
            { id: '2', name: 'Jane Smith', address: '0xc542BdA5EC1aC9b86fF470c04062D6a181e67928' }
          ]
        }
      })
      const recipientInput = wrapper.find('input[data-test="recipient-input"]')
      await recipientInput.setValue('0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E')
      const amountInput = wrapper.find('input[data-test="amount-input"]')
      await amountInput.setValue('0')
      await wrapper.find('.btn-primary').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.text-red-500').exists()).toBe(true)
    })
    it('shows error when amount is empty', async () => {
      const wrapper = mount(TransferFromBankForm, {
        props: {
          loading: false,
          bankBalance: '100',
          filteredMembers: [
            { id: '1', name: 'John Doe', address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E' },
            { id: '2', name: 'Jane Smith', address: '0xc542BdA5EC1aC9b86fF470c04062D6a181e67928' }
          ]
        }
      })

      const amountInput = wrapper.find('input[data-test="amount-input"]')
      await amountInput.setValue('')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.find('.text-red-500').exists()).toBe(true)
    })
    it('shows error when amount is not numeric', async () => {
      const wrapper = mount(TransferFromBankForm, {
        props: {
          loading: false,
          bankBalance: '100',
          filteredMembers: [
            { id: '1', name: 'John Doe', address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E' },
            { id: '2', name: 'Jane Smith', address: '0xc542BdA5EC1aC9b86fF470c04062D6a181e67928' }
          ]
        }
      })

      const amountInput = wrapper.find('input[data-test="amount-input"]')
      await amountInput.setValue('sdkjnvc')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.find('.text-red-500').exists()).toBe(true)
    })
  })
})

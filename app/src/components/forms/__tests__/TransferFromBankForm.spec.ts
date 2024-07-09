// TransferFromBankForm.spec.ts
import { it, expect, describe, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TransferFromBankForm from '../TransferFromBankForm.vue'

describe('TransferFromBankForm.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(TransferFromBankForm, {
      props: {
        loading: false,
        bankBalance: '100',
        filteredMembers: [
          { id: '1', name: 'John Doe', address: '0xAddress1' },
          { id: '2', name: 'Jane Smith', address: '0xAddress2' }
        ]
      }
    })
  })
  describe('Renders', () => {
    it('renders initial UI correctly', () => {
      expect(wrapper.find('h1').text()).toBe('Transfer from Bank Contract')
      expect(wrapper.find('.btn-primary').text()).toBe('Transfer')
      expect(wrapper.find('.btn-error').text()).toBe('Cancel')
      expect(wrapper.find('.input-md input[type="text"]').element).toBeDefined()
    })
  })
  describe('Actions', () => {
    it('updates "to" value when selecting member from dropdown', async () => {
      const dropdownOption = wrapper.find('.dropdown-content a')
      await dropdownOption.trigger('click')
      expect((wrapper.vm as any).to).toBe('0xAddress1')
    })

    it('emits transfer event when Transfer button is clicked', async () => {
      const transferButton = wrapper.find('.btn-primary')
      await transferButton.trigger('click')
      expect(wrapper.emitted('transfer')).toBeTruthy()
    })

    it('emits closeModal event when Cancel button is clicked', async () => {
      const cancelButton = wrapper.find('.btn-error')
      await cancelButton.trigger('click')
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })
  })
})

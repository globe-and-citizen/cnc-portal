import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TransferOwnershipForm from '@/components/sections/AdministrationView/forms/TransferOwnershipForm.vue'

interface ComponentData {
  transferOwnershipLoading: boolean
}

describe('TransferOwnershipForm.vue', () => {
  function mountComponent(props?: ComponentData) {
    return mount(TransferOwnershipForm, {
      ...props,
      props: {
        transferOwnershipLoading: false
      }
    })
  }

  describe('Renders', () => {
    it('should render input for new owner', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('[data-test="new-owner-input"]').exists()).toBeTruthy()
    })

    it('should render button to submit form', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('[data-test="submit-button"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="submit-button"]').text()).toBe('Submit')
    })
  })

  describe('Emits', async () => {
    it('should emit transferOwnership event when form is submitted', async () => {
      const wrapper = mountComponent()
      const input = wrapper.find('[data-test="new-owner-input"]')
      await input.setValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
      await wrapper.find('[data-test="submit-button"]').trigger('click')
      expect(wrapper.emitted('transferOwnership')).toBeTruthy()
    })

    it('should not emit transferOwnership event when form is submitted with invalid address', async () => {
      const wrapper = mountComponent()
      const input = wrapper.find('[data-test="new-owner-input"]')
      await input.setValue('0x00')
      await wrapper.find('[data-test="submit-button"]').trigger('click')
      expect(wrapper.emitted('transferOwnership')).toBeFalsy()
    })
  })
})

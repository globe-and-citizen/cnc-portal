import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TransferOwnershipForm from '@/components/sections/AdministrationView/forms/TransferOwnershipForm.vue'

describe('TransferOwnershipForm.vue', () => {
  function mountComponent(props?: Record<string, unknown>) {
    return mount(TransferOwnershipForm, {
      props: {
        transferOwnershipLoading: false,
        ...props
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

    it('renders the inline error alert when errorMessage prop is provided', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('[data-test="error-alert"]').exists()).toBe(false)

      const withError = mountComponent({ errorMessage: 'Ownership transfer failed' })
      expect(withError.find('[data-test="error-alert"]').exists()).toBe(true)
      expect(withError.find('[data-test="error-alert"]').text()).toContain(
        'Ownership transfer failed'
      )
    })
  })

  describe('Emits', () => {
    it('should emit transferOwnership event when form is submitted', async () => {
      const wrapper = mountComponent()
      const input = wrapper.find('[data-test="new-owner-input"]')
      await input.setValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.emitted('transferOwnership')).toBeTruthy()
    })

    it('should not emit transferOwnership event when form is submitted with invalid address', async () => {
      const wrapper = mountComponent()
      const input = wrapper.find('[data-test="new-owner-input"]')
      await input.setValue('0x00')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.emitted('transferOwnership')).toBeFalsy()
    })
  })
})

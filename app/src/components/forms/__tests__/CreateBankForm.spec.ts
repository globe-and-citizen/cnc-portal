import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import CreateBankForm from '@/components/forms/CreateBankForm.vue'

describe('CreateBankModal.vue', () => {
  describe('render', () => {
    it('renders correctly', () => {
      const wrapper = mount(CreateBankForm, {
        props: { loading: false }
      })

      expect(wrapper.find('h1').text()).toBe('Create Team Bank Contract')
      expect(wrapper.find('h3').text()).toContain('By clicking "Deploy Bank Contract"')
    })
    it('shows loading button when loading is true', () => {
      const wrapper = mount(CreateBankForm, {
        props: { loading: true }
      })

      expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(true)
    })

    it('shows deploy button when loading is false', () => {
      const wrapper = mount(CreateBankForm, {
        props: { loading: false }
      })

      expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(false)
      expect(wrapper.find('.btn-primary').exists()).toBe(true)
    })
  })
  describe('emits', () => {
    it('emits createBank when Deploy Bank Contract button is clicked', async () => {
      const wrapper = mount(CreateBankForm, {
        props: { loading: false }
      })

      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.emitted()).toHaveProperty('createBank')
    })
  })
})

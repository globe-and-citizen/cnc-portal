import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import CreateAddCampaign from '@/components/forms/CreateAddCamapaign.vue'

describe('CreateAddCampaign.vue', () => {
  describe('render', () => {
    it('renders correctly', () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0x123456' }
      })

      expect(wrapper.find('h4').text()).toBe('Deploy Advertisement Campaign contract')
      expect(wrapper.find('h3').text()).toContain('By clicking "Deploy Advertisement Contract"')
    })

    it('shows loading button when loading is true', () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: true, bankAddress: '0x123456' }
      })

      expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(true)
    })

    it('shows deploy button when loading is false', () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0x123456' }
      })

      expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(false)
      expect(wrapper.find('.btn-primary').exists()).toBe(true)
    })

    it('disables the bank contract input field', () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0x123456' }
      })

      const bankInput = wrapper.find('input[type="string"]')
      expect(bankInput.element.disabled).toBe(true)
      expect(bankInput.element.value).toBe('0x123456')
    })
  })

  describe('emits', () => {
    it('emits createAddCampaign with correct values when the confirm button is clicked', async () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0x123456' }
      })

      // Directly set the ref values
      wrapper.vm.costPerClick = 0.1
      wrapper.vm.costPerImpression = 0.2

      await wrapper.find('.btn-primary').trigger('click')

      expect(wrapper.emitted()).toHaveProperty('createAddCampaign')
      expect(wrapper.emitted('createAddCampaign')?.[0]).toEqual([0.1, 0.2])
    })

    it('does not emit createAddCampaign if costPerClick or costPerImpression is null', async () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0x123456' }
      })

      // Leave the values as null (default state)
      await wrapper.find('.btn-primary').trigger('click')

      expect(wrapper.emitted('createAddCampaign')).toBeUndefined() // This should now pass
    })
  })
})

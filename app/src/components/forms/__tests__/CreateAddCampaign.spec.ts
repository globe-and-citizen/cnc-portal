import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import CreateAddCampaign from '@/components/forms/CreateAddCampaign.vue'
import ButtonUI from '@/components/ButtonUI.vue'

describe.skip('CreateAddCampaign.vue', () => {
  describe('render', () => {
    it('renders correctly', () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0x123456' }
      })

      expect(wrapper.find('h4').text()).toBe('Deploy Advertisement Campaign contract')
      expect(wrapper.find('h3').text()).toContain('By clicking "Deploy Advertisement Contract"')
    })

    it('shows the bank address input and is disabled', () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0x123456' }
      })

      const bankAddressInput = wrapper.find('input[data-testid="bank-address-input"]')
      expect((bankAddressInput.element as HTMLInputElement)?.value).toBe('0x123456')
      expect(bankAddressInput.attributes('disabled')).toBeDefined()
    })

    it('shows loading button when loading is true', () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: true, bankAddress: '0x123456' }
      })

      const allButtonComponentsWrapper = wrapper.findAllComponents(ButtonUI)
      expect(allButtonComponentsWrapper[1].props().loading).toBe(true)
    })
  })

  describe('emits', () => {
    it('emits createAddCampaign with correct values when the confirm button is clicked', async () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0x123456' }
      })

      // Directly set the ref values
      await wrapper.find('input[placeholder="cost per click in matic"]').setValue(0.1)
      await wrapper.find('input[placeholder="cost per in matic"]').setValue(0.2)

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

      expect(wrapper.emitted('createAddCampaign')).toBeUndefined()
    })

    it('shows an alert if costPerClick or costPerImpression is invalid', async () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0x123456' }
      })

      // Set costPerClick to null and costPerImpression to 0.2
      await wrapper.find('input[placeholder="cost per in matic"]').setValue(0.2)

      // Mock the alert function
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})

      await wrapper.find('.btn-primary').trigger('click')

      // Check that the alert was called and the event was not emitted
      expect(alertMock).toHaveBeenCalledWith('Please enter valid numeric values for both rates.')
      expect(wrapper.emitted('createAddCampaign')).toBeUndefined()

      alertMock.mockRestore()
    })
  })

  describe('other actions', () => {
    it('opens the correct URL when viewContractCode button is clicked', async () => {
      const wrapper = mount(CreateAddCampaign, {
        props: { loading: false, bankAddress: '0x123456' }
      })

      const openMock = vi.spyOn(window, 'open').mockImplementation(() => null)

      // Simulate click on the "viewContractCode" button
      await wrapper.find('button.btn-secondary').trigger('click')

      // Check that window.open was called with the correct URL
      expect(openMock).toHaveBeenCalledWith(
        'https://polygonscan.com/address/0x30625FE0E430C3cCc27A60702B79dE7824BE7fD5#code',
        '_blank'
      )

      openMock.mockRestore()
    })
  })
})

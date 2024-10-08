import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ApproveUsersForm from '../ApproveUsersForm.vue'

interface ComponentData {
  addressToApprove: string
  addressToDisapprove: string
  description: string
}

describe('ApproveUsersForm', () => {
  interface ComponentOptions {
    props?: {}
  }

  const createComponent = ({ props = {} }: ComponentOptions = {}) => {
    return mount(ApproveUsersForm, {
      props: {
        loadingApprove: false,
        loadingDisapprove: false,
        isBodAction: false,
        approvedAddresses: new Set([]),
        unapprovedAddresses: new Set([]),
        ...props
      }
    })
  }
  describe('Render', () => {
    it('should show bod notification and description input if is BoD action', () => {
      const wrapper = createComponent({ props: { isBodAction: true } })
      expect(wrapper.find('[data-test="bod-notification"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="description-input"]').exists()).toBe(true)
    })
    it('should show approved addresses list if there are approved addresses', () => {
      const wrapper = createComponent({
        props: { approvedAddresses: new Set(['0xApprovedAddress']) }
      })
      expect(wrapper.find('[class="table table-zebra"]').exists()).toBe(true)
    })
    it('should show loading button when disapproving address', async () => {
      const wrapper = createComponent({
        props: {
          loadingDisapprove: true,
          approvedAddresses: new Set(['0xAddressToDisapprove'])
        }
      })
      ;(wrapper.vm as unknown as ComponentData).addressToDisapprove = '0xAddressToDisapprove'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="loading-disapprove"]').exists()).toBeTruthy()
    })
    it('should show disapproved addresses', () => {
      const wrapper = createComponent({
        props: { unapprovedAddresses: new Set(['0xUnapprovedAddress']) }
      })
      expect(wrapper.find('select').exists()).toBeTruthy()
    })
    it('should show loading button when approving address', async () => {
      const wrapper = createComponent({
        props: {
          loadingApprove: true,
          unapprovedAddresses: new Set(['0xAddressToApprove'])
        }
      })
      ;(wrapper.vm as unknown as ComponentData).addressToDisapprove = '0xAddressToApprove'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="loading-approve"]').exists()).toBeTruthy()
    })
    it('should show description error when no description is entered', async () => {
      const wrapper = createComponent({ props: { isBodAction: true, unapprovedAddresses: new Set(['0xUnapprovedAddress']) } })
      expect(wrapper.find('[data-test="bod-notification"]').exists()).toBe(true)
      const approveButton = wrapper.find('[data-test="approve-button"]')
      expect(approveButton.exists()).toBeTruthy()
      approveButton.trigger('click')
      await wrapper.vm.$nextTick()
      const descriptionError = wrapper.find('[data-test="description-error"]')
      expect(descriptionError.exists()).toBeTruthy()
      expect(descriptionError.text()).toBe('Description is required')
    })
    it('should show address to approve error when no address is selected', async () => {
      const wrapper = createComponent({ 
        props: { 
          unapprovedAddresses: new Set(['0xUnapprovedAddress']) 
        } 
      })
      const approveButton = wrapper.find('[data-test="approve-button"]')
      expect(approveButton.exists()).toBeTruthy()
      approveButton.trigger('click')
      await wrapper.vm.$nextTick()    
      const approveError = wrapper.find('[data-test="approve-error"]')
      expect(approveError.exists()).toBeTruthy()
      expect(approveError.text()).toBe('Address is required')
    })
  })
  describe('State & V-Model', () => {
    it('should update address to disapprove when disapproving', async () => {
      const wrapper = createComponent({
        props: { approvedAddresses: new Set(['0xApprovedAddress']) }
      })
      const disapproveButton = wrapper.find('[data-test="disapprove-button"]')
      expect(disapproveButton.exists()).toBe(true)
      disapproveButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect((wrapper.vm as unknown as ComponentData).addressToDisapprove).toBe('0xApprovedAddress')
    })
    it('should update description', async () => {
      const wrapper = createComponent({ props: { isBodAction: true } })
      const descriptionInput = wrapper.find('[data-test="description-input"]')
      expect(descriptionInput.exists()).toBeTruthy()
      await descriptionInput.setValue('test description')
      expect((wrapper.vm as unknown as ComponentData).description).toBe('test description')
    })
    it('should update address to approve when approving', async () => {
      const wrapper = createComponent({
        props: { unapprovedAddresses: new Set(['0xDisapprovedAddress']) }
      })
      const selectInput = wrapper.find('select')
      expect(selectInput.exists()).toBeTruthy()
      await selectInput.setValue('0xDisapprovedAddress')
    })
  })
  // describe('Emits', () => {
  //   it('emits setLimitForm when submit button is clicked', async () => {
  //     const wrapper = createComponent()
  //     ;(wrapper.vm as unknown as ComponentData).amount = '0.20'
  //     ;(wrapper.vm as unknown as ComponentData).description = 'Test descriptions'
  //     await wrapper.vm.$nextTick()
  //     await wrapper.find('button[data-test="transferButton"]').trigger('click')
  //     expect(wrapper.emitted('setLimit')).toBeTruthy()
  //   })
  // })
})

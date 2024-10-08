import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SetLimitForm from '../SetLimitForm.vue'
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
      const wrapper = createComponent({props: { approvedAddresses: new Set(['0xApprovedAddress']) }})
      expect(wrapper.find('[class="table table-zebra"]').exists()).toBe(true)
    })
    it('should show loading button when disapproving address', async () => {
      const wrapper = createComponent({ 
        props: { 
          loadingDisapprove: true, 
          approvedAddresses: new Set(['0xAddressToDisapprove'])} 
      })
      ;(wrapper.vm as unknown as ComponentData).addressToDisapprove = '0xAddressToDisapprove'
      await wrapper.vm.$nextTick()
      expect((wrapper.find('[data-test="loading-disapprove"]')).exists()).toBeTruthy()
    })
    it('should show disapproved addresses', () => {
      const wrapper = createComponent({ props: { unapprovedAddresses: new Set(['0xUnapprovedAddress']) } })
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
      expect((wrapper.find('[data-test="loading-approve"]')).exists()).toBeTruthy()
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

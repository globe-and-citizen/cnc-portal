import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ApproveUsersForm from '../ApproveUsersForm.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { type Ref } from 'vue'
import { type Validation, type ValidationRuleWithParams } from '@vuelidate/core'

interface ComponentData {
  addressToApprove: string
  addressToDisapprove: string
  description: string
  action: string
  v$: Ref<
    Validation<{
      addressToApprove: {
        required: ValidationRuleWithParams<object, unknown>
      }
      description: {
        required: ValidationRuleWithParams<object, unknown>
      }
    }>
  >
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
      expect(wrapper.find('[data-test="approved-addresses-table"]').exists()).toBe(true)
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
      const disapproveButtonComponent = wrapper.find('[data-test="disapprove-button"]').findComponent(ButtonUI)
      expect(disapproveButtonComponent.exists()).toBeTruthy()
      expect(disapproveButtonComponent.props().loading).toBe(true)
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
      const approveButtonComponent = wrapper.find('[data-test="approve-button"]').findComponent(ButtonUI)
      expect(approveButtonComponent.exists()).toBeTruthy()
      expect(approveButtonComponent.props().loading).toBe(true)
    })
    it('should show description error when no description is entered', async () => {
      const wrapper = createComponent({
        props: { isBodAction: true, unapprovedAddresses: new Set(['0xUnapprovedAddress']) }
      })
      expect(wrapper.find('[data-test="bod-notification"]').exists()).toBe(true)
      const approveButton = wrapper.find('[data-test="approve-button"]')
      expect(approveButton.exists()).toBeTruthy()
      await approveButton.trigger('click')
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
      await approveButton.trigger('click')
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
      await disapproveButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect((wrapper.vm as unknown as ComponentData).addressToDisapprove).toBe('0xApprovedAddress')
    })
    it('should update description when description is entered in description input', async () => {
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
  describe('Emits', () => {
    it('should emit approveAddress when submit button is clicked', async () => {
      const addressToApprove = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
      const wrapper = createComponent({
        props: {
          unapprovedAddresses: new Set([addressToApprove])
        }
      })
      const selectInput = wrapper.find('select')
      expect(selectInput.exists()).toBeTruthy()
      await selectInput.setValue(addressToApprove)
      expect((wrapper.vm as unknown as ComponentData).addressToApprove).toBe(addressToApprove)
      await wrapper.vm.$nextTick()
      await wrapper.find('button[data-test="approve-button"]').trigger('click')
      expect(wrapper.emitted('approveAddress')).toBeTruthy()
    })
    it('should not emit approve address if form is invalid', async () => {
      const addressToApprove = '0xSomeAddress'
      const wrapper = createComponent({
        props: {
          unapprovedAddresses: new Set([addressToApprove])
        }
      })
      await wrapper.find('button[data-test="approve-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      //@ts-ignore
      expect(wrapper.vm.v$.$invalid).toBe(true)
      expect(wrapper.emitted('approveAddress')).toBeFalsy()
    })
    it('should not emit disapprove address if form is invalid', async () => {
      const addressToDisapprove = '0xSomeAddress'
      const wrapper = createComponent({
        props: {
          isBodAction: true,
          approvedAddresses: new Set([addressToDisapprove])
        }
      })
      await wrapper.find('button[data-test="disapprove-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      //@ts-ignore
      expect(wrapper.vm.v$.$invalid).toBe(true)
      expect(wrapper.emitted('disapproveAddress')).toBeFalsy()
    })
    it('should emit close modal when cancel button is clicked', async () => {
      const wrapper = createComponent({
        props: {
          unapprovedAddresses: new Set(['0xUnapprovedAddress'])
        }
      })
      const cancelButton = wrapper.find('[data-test=cancel-button]')
      await cancelButton.trigger('click')
      await wrapper.vm.$nextTick()
      await cancelButton.trigger('click')
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })
  })
})

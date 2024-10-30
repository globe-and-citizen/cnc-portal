import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ApproveUsersForm from '../ApproveUsersEIP712Form.vue'
import { type Ref } from 'vue'
import { type Validation, type ValidationRuleWithParams } from '@vuelidate/core'

interface ComponentData {
  budgetLimitType: 0 | 1 | 2 | null
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
        formData: [{ name: '', address: '' }],
        loadingApprove: false,
        isBodAction: false,
        users: [],
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
    it('should show description error when no description is entered', async () => {
      const wrapper = createComponent({
        props: { isBodAction: true/*, unapprovedAddresses: new Set(['0xUnapprovedAddress'])*/ }
      })
      expect(wrapper.find('[data-test="bod-notification"]').exists()).toBe(true)
      const approveButton = wrapper.find('[data-test="approve-button"]')
      expect(approveButton.exists()).toBeTruthy()
      approveButton.trigger('click')
      await wrapper.vm.$nextTick()
      const descriptionError = wrapper.find('[data-test="description-error"]')
      expect(descriptionError.exists()).toBeTruthy()
      expect(descriptionError.text()).toBe('Description is required')
    })
    it('should show the user name and address inputs', async () => {
      const wrapper = createComponent()

      const nameInput = wrapper.find('[data-test="name-input-0"]')
      const addressInput = wrapper.find('[data-test="address-input-0"]')
      expect(nameInput.exists()).toBe(true)
      expect(addressInput.exists()).toBe(true)
    })
    it('should show address error when no address is entered', async () => {
      const wrapper = createComponent()

      const nameInput = wrapper.find('[data-test="name-input-0"]')
      const addressInput = wrapper.find('[data-test="address-input-0"]')
      expect(nameInput.exists()).toBe(true)
      expect(addressInput.exists()).toBe(true)

      const approveButton = wrapper.find('[data-test="approve-button"]')
      expect(approveButton.exists()).toBeTruthy()
      approveButton.trigger('click')
      await wrapper.vm.$nextTick()

      const addressError = wrapper.find('[data-test="address-error"]')
      expect(addressError.exists()).toBeTruthy()
    })
    it('should show budget limit types', () => {
      const wrapper = createComponent()
      expect(wrapper.find('select').exists()).toBeTruthy()
    })
    it('should show budget limit error when no limit is set', async () => {
      const wrapper = createComponent()
      expect(wrapper.find('select').exists()).toBeTruthy()

      // expect(wrapper.find('[data-test="bod-notification"]').exists()).toBe(true)
      const approveButton = wrapper.find('[data-test="approve-button"]')
      expect(approveButton.exists()).toBeTruthy()
      approveButton.trigger('click')
      await wrapper.vm.$nextTick()    
      
      const limitTypeError = wrapper.find('[data-test="limit-type-error"]')
      expect(limitTypeError.exists()).toBeTruthy()
      expect(limitTypeError.text()).toBe('Budget limit type is required')
    })
    it('should show limit value input', async () => {
      const wrapper = createComponent()
      expect(wrapper.find('[data-test="limit-value-input"]').exists()).toBeTruthy()
    })
    it('should show limit value error if no value is set', async () => {
      const wrapper = createComponent()

      const approveButton = wrapper.find('[data-test="approve-button"]')
      expect(approveButton.exists()).toBeTruthy()
      approveButton.trigger('click')
      await wrapper.vm.$nextTick()    
      
      const limitValueError = wrapper.find('[data-test="limit-value-error"]')
      expect(limitValueError.exists()).toBeTruthy()
      expect(limitValueError.text()).toBe('Value is required')
    })
    it('should show set expiry date picker', async () => {
      const wrapper = createComponent()
      const datePicker = wrapper.find('[data-test="date-picker"]')
      expect(datePicker.exists()).toBeTruthy()
    })
    it('should show loading button when approving address', async () => {
      const wrapper = createComponent({
        props: {
          loadingApprove: true
        }
      })
      ;(wrapper.vm as unknown as ComponentData).addressToDisapprove = '0xAddressToApprove'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="loading-approve"]').exists()).toBeTruthy()
    })
  })
  describe('State & V-Model', () => {
    it('should update description when description is entered in description input', async () => {
      const wrapper = createComponent({ props: { isBodAction: true } })
      const descriptionInput = wrapper.find('[data-test="description-input"]')
      expect(descriptionInput.exists()).toBeTruthy()
      await descriptionInput.setValue('test description')
      expect((wrapper.vm as unknown as ComponentData).description).toBe('test description')
    })
    it('should update user name when name is entered in name input', async () => {
      const wrapper = createComponent()
      const addressInput = wrapper.find('[data-test="name-input-0"]')
      expect(addressInput.exists()).toBeTruthy()
      await addressInput.setValue('Test Name')
      const formDataProp = wrapper.props('formData')
      expect(formDataProp[0].name).toBe('Test Name')
    })
    it('should update user address when address is entered in address input', async () => {
      const wrapper = createComponent()
      const addressInput = wrapper.find('[data-test="address-input-0"]')
      expect(addressInput.exists()).toBeTruthy()
      await addressInput.setValue('0xAddressToApprove')
      const formDataProp = wrapper.props('formData')
      expect(formDataProp[0].address).toBe('0xAddressToApprove')
    })
    it('should update budgetLimitType when limit type is is selected', async () => {
      const wrapper = createComponent()
      const limitTypeSelect = wrapper.find('select')
      expect(limitTypeSelect.exists()).toBeTruthy()
      await limitTypeSelect.setValue(1)
      expect((wrapper.vm as unknown as ComponentData).budgetLimitType).toBe(1)
    })
  })
  describe('Emits', () => {
    it('should emit searchUsers on keyup', async () => {
      const wrapper = createComponent()

      const nameInput = wrapper.find('[data-test="name-input-0"]')
      const addressInput = wrapper.find('[data-test="address-input-0"]')
      expect(nameInput.exists()).toBe(true)
      expect(addressInput.exists()).toBe(true)

      nameInput.setValue('Test Name')
      nameInput.trigger('keyup')
      expect(wrapper.emitted('searchUsers')).toBeTruthy()
      expect(wrapper.emitted('searchUsers')?.[0]).toEqual([{ name: 'Test Name', address: "" }])

      addressInput.setValue('0xSearchAddress')
      nameInput.trigger('keyup')
      expect(wrapper.emitted('searchUsers')).toBeTruthy()
      expect(wrapper.emitted('searchUsers')?.[0]).toEqual([{ name: "Test Name", address: "0xSearchAddress" }])
    })
    it('should not emit approve address if form is invalid', async () => {
      const wrapper = createComponent()
      await wrapper.find('button[data-test="approve-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      //@ts-ignore
      expect(wrapper.vm.v$.$invalid).toBe(true)
      expect(wrapper.emitted('approveUser')).toBeFalsy()
    })
  })
})

import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ApproveUsersForm from '../ApproveUsersEIP712Form.vue'
import { type Ref } from 'vue'
import type {
  Validation,
  ValidationRule,
  ValidationRuleWithoutParams,
  ValidationRuleWithParams
} from '@vuelidate/core'
import VueDatePicker from '@vuepic/vue-datepicker'
import ButtonUI from '@/components/ButtonUI.vue'
import { zeroAddress } from 'viem'

interface ComponentData {
  selectedOptions: { [key in 0 | 1 | 2]: boolean }
  values: { [key in 0 | 1 | 2]: null | string | number }
  resultArray: {
    budgetType: number
    value: string | number
  }[]
  budgetLimitType: 0 | 1 | 2 | null
  limitValue: string
  date: Date | string
  formData: { name: string; address: string }[]
  input: { name: string; address: string }
  expiry: string
  addressToApprove: string
  addressToDisapprove: string
  description: string
  action: string
  selectedToken: string
  v$: Ref<
    Validation<{
      formData: {
        $each: {
          $validator: ValidationRule
          $message: () => string
        }
        $valid: ValidationRuleWithParams<object, unknown>
      }
      budgetLimitType: {
        required: ValidationRuleWithParams<object, unknown>
      }
      limitValue: {
        required: ValidationRuleWithoutParams<unknown>
        numeric: ValidationRuleWithoutParams<unknown>
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
    global?: Record<string, unknown>
  }

  const createComponent = ({ props = {}, global = {} }: ComponentOptions = {}) => {
    return mount(ApproveUsersForm, {
      props: {
        formData: [{ name: '', address: '' }],
        loadingApprove: false,
        isBodAction: false,
        users: [],
        ...props
      },
      global: { ...global }
    })
  }
  describe('Render', () => {
    it('should show budget limit inputs disabled', () => {
      const wrapper = createComponent()

      const budgetLimitInputs = wrapper.findAll('[data-test="budget-limit-input"]')
      expect(budgetLimitInputs.length).toBe(3)
    })
    it('should enable the relavant input when checkbox is checked', async () => {
      const wrapper = createComponent()

      const checkboxInput = wrapper.find('[data-test="limit-checkbox-0"]')
      expect(checkboxInput.exists()).toBeTruthy()
      const limitInput = wrapper.find('[data-test="limit-input-0"]')
      expect(limitInput.exists()).toBeTruthy()
      expect((limitInput.element as HTMLInputElement).disabled).toBe(true)
      expect((checkboxInput.element as HTMLInputElement).checked).toBe(false)
      await checkboxInput.setValue()
      await wrapper.vm.$nextTick()
      expect((checkboxInput.element as HTMLInputElement).checked).toBe(true)
      expect((limitInput.element as HTMLInputElement).disabled).toBe(false)
    })
    it('should show bod notification and description input if is BoD action', () => {
      const wrapper = createComponent({ props: { isBodAction: true } })
      expect(wrapper.find('[data-test="bod-notification"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="description-input"]').exists()).toBe(true)
    })
    it('should show description error when no description is entered', async () => {
      const wrapper = createComponent({
        props: { isBodAction: true /*, unapprovedAddresses: new Set(['0xUnapprovedAddress'])*/ }
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

      expect(wrapper.findComponent({ name: 'SelectMemberWithTokenInput' }).exists()).toBeTruthy()
    })
    it('should show address error when no address is entered', async () => {
      const wrapper = createComponent()

      expect(wrapper.findComponent({ name: 'SelectMemberWithTokenInput' }).exists()).toBeTruthy()
      const approveButton = wrapper.find('[data-test="approve-button"]')
      expect(approveButton.exists()).toBeTruthy()
      approveButton.trigger('click')
      await wrapper.vm.$nextTick()

      const addressError = wrapper.find('[data-test="address-error"]')
      expect(addressError.exists()).toBeTruthy()
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
      const loadingApproveButton = wrapper
        .find('[data-test="approve-button"]')
        .findComponent(ButtonUI)
      expect(loadingApproveButton.exists()).toBeTruthy()
      expect(loadingApproveButton.props().loading).toBe(true)
    })
  })
  describe('State & V-Model', () => {
    it('should update update the relevant values and compute budget data when a limit value is entered', async () => {
      const wrapper = createComponent()
      const checkboxInput = wrapper.find('[data-test="limit-checkbox-0"]')
      expect(checkboxInput.exists()).toBeTruthy()
      const limitInput = wrapper.find('[data-test="limit-input-0"]')
      expect(limitInput.exists()).toBeTruthy()
      expect((limitInput.element as HTMLInputElement).disabled).toBe(true)
      expect((checkboxInput.element as HTMLInputElement).checked).toBe(false)
      await checkboxInput.setValue()
      await wrapper.vm.$nextTick()
      expect((checkboxInput.element as HTMLInputElement).checked).toBe(true)
      expect((limitInput.element as HTMLInputElement).disabled).toBe(false)
      await limitInput.setValue(1000)
      await wrapper.vm.$nextTick()
      expect((wrapper.vm as unknown as ComponentData).values).toStrictEqual({
        0: 1000,
        1: null,
        2: null
      })
      expect((wrapper.vm as unknown as ComponentData).resultArray).toStrictEqual([
        {
          budgetType: 0,
          value: 1000
        }
      ])
    })
    it('should update description when description is entered in description input', async () => {
      const wrapper = createComponent({ props: { isBodAction: true } })
      const descriptionInput = wrapper.find('[data-test="description-input"]')
      expect(descriptionInput.exists()).toBeTruthy()
      await descriptionInput.setValue('test description')
      expect((wrapper.vm as unknown as ComponentData).description).toBe('test description')
    })
    it('should update user address when address is entered in name input', async () => {
      const wrapper = createComponent()
      const selectMemberInput = wrapper.findComponent({ name: 'SelectMemberWithTokenInput' })
      expect(selectMemberInput.exists()).toBeTruthy()
      const memberAddressInput = selectMemberInput.find('[data-test="member-address-input"]')
      expect(memberAddressInput.exists()).toBeTruthy()
      const memberNameInput = selectMemberInput.find('[data-test="member-name-input"]')
      expect(memberNameInput.exists()).toBeTruthy()
      await memberAddressInput.setValue('0xAddressToApprove')
      await memberNameInput.setValue('Test Name')
      await flushPromises()
      //@ts-expect-error: not visible on wrapper
      expect(wrapper.vm.input).toEqual({
        name: 'Test Name',
        address: '0xAddressToApprove',
        token: zeroAddress
      })
    })
    it('should update date when expiry date is selected', async () => {
      const wrapper = createComponent()
      const datePicker = wrapper.findComponent(VueDatePicker)
      expect(datePicker.exists()).toBeTruthy()
      const newDate = new Date()
      datePicker.vm.$emit('update:model-value', newDate)
      expect((wrapper.vm as unknown as ComponentData).date).toBe(newDate)
    })
    it('should correctly format expiry', async () => {})
  })
  describe('Emits', () => {
    it('should not emit approve address if form is invalid', async () => {
      const wrapper = createComponent()
      await wrapper.find('button[data-test="approve-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      // TODO: this check is not valid
      // @ts-expect-error: mocked
      expect(wrapper.vm.v$.$invalid).toBe(true)
      expect(wrapper.emitted('approveUser')).toBeFalsy()
    })
    it('should emit approve address with correct arguments', async () => {
      const wrapper = createComponent()

      const date = new Date(Date.now() + 60 * 60 * 1000)
      const formData = [
        {
          name: 'Test User',
          address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          token: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92267'
        }
      ]
      //@ts-expect-error: not visible on wrapper
      wrapper.vm.selectedOptions['0'] = true
      //@ts-expect-error: not visible on wrapper
      wrapper.vm.values['0'] = 100
      ;(wrapper.vm as unknown as ComponentData).date = date
      ;(wrapper.vm as unknown as ComponentData).input = formData[0]
      ;(wrapper.vm as unknown as ComponentData).description = 'description'

      await wrapper.vm.$nextTick()
      //@ts-expect-error: not visible on wrapper
      wrapper.vm.submitApprove()

      // @ts-expect-error: mocked
      expect(wrapper.vm.v$.$invalid).toBe(false)
      expect(wrapper.emitted('approveUser')).toBeTruthy()
    })
    it('should show budget limit errors', async () => {
      const wrapper = createComponent()

      const date = new Date(Date.now() + 60 * 60 * 1000)
      const formData = [
        {
          name: 'Test User',
          address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          token: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92267'
        }
      ]

      ;(wrapper.vm as unknown as ComponentData).date = date
      ;(wrapper.vm as unknown as ComponentData).input = formData[0]
      ;(wrapper.vm as unknown as ComponentData).description = 'description'

      await wrapper.vm.$nextTick()
      //@ts-expect-error: not visible on wrapper
      wrapper.vm.submitApprove()
      await wrapper.vm.$nextTick()
      // @ts-expect-error: mocked
      expect(wrapper.vm.v$.$invalid).toBe(true)
      const budgetLimitError = wrapper.find('[data-test="budget-limit-error"]')
      expect(budgetLimitError.exists()).toBeTruthy()
      expect(budgetLimitError.html()).toContain('At least one budget limit must be set')
    })
  })
  describe('Methods', () => {
    it('should clear or reset the state variables', async () => {
      const wrapper = createComponent()

      const cancelButton = wrapper.find('[data-test="cancel-button"]')
      expect(cancelButton.exists()).toBeTruthy()
      cancelButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect((wrapper.vm as unknown as ComponentData).date).toBe('')
      expect((wrapper.vm as unknown as ComponentData).limitValue).toBe('')
      expect((wrapper.vm as unknown as ComponentData).budgetLimitType).toBe(null)
    })
  })
})

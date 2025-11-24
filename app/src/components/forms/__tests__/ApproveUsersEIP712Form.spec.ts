import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ApproveUsersForm from '../ApproveUsersEIP712Form.vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import ButtonUI from '@/components/ButtonUI.vue'
import SelectMemberWithTokenInput from '@/components/utils/SelectMemberWithTokenInput.vue'
import SelectComponent from '@/components/SelectComponent.vue'

// Mock the SelectComponent
vi.mock('@/components/SelectComponent.vue', () => ({
  default: {
    template:
      '<select><option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option></select>',
    props: ['modelValue', 'options'],
    emits: ['update:modelValue']
  }
}))

describe('ApproveUsersForm', () => {
  const defaultProps = {
    loadingApprove: false,
    isBodAction: false,
    formData: [{ name: '', address: '' }],
    users: []
  }

  const createWrapper = (props = {}) => {
    return mount(ApproveUsersForm, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: {
          SelectComponent: true,
          SelectMemberWithTokenInput: true
        }
      }
    })
  }

  describe('Rendering', () => {
    it('renders the component title', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('h1').text()).toBe('Approve User EIP712')
    })

    it('shows BoD notification and description input when isBodAction is true', () => {
      const wrapper = createWrapper({ isBodAction: true })

      expect(wrapper.find('[data-test="bod-notification"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="description-input"]').exists()).toBe(true)
    })

    it('hides BoD notification and description input when isBodAction is false', () => {
      const wrapper = createWrapper({ isBodAction: false })

      expect(wrapper.find('[data-test="bod-notification"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="description-input"]').exists()).toBe(false)
    })

    it('renders SelectMemberWithTokenInput component', () => {
      const wrapper = createWrapper()
      expect(wrapper.findComponent(SelectMemberWithTokenInput).exists()).toBe(true)
    })

    it('renders budget amount input with SelectComponent for frequency', () => {
      const wrapper = createWrapper()

      const amountInput = wrapper.find('[data-test="amount-input"]')
      expect(amountInput.exists()).toBe(true)
      expect(amountInput.attributes('type')).toBe('number')

      const selectComponent = wrapper.findComponent(SelectComponent)
      expect(selectComponent.exists()).toBe(true)
    })

    it('shows custom frequency input only when frequencyType is 4 (Custom)', async () => {
      const wrapper = createWrapper()

      // Initially should not be visible
      expect(wrapper.find('[data-test="custom-frequency-input"]').exists()).toBe(false)

      // Set frequencyType to 4 (Custom)
      //@ts-expect-error not visible on wrapper
      wrapper.vm.frequencyType = 4

      await flushPromises()

      // Should now be visible
      expect(wrapper.find('[data-test="custom-frequency-input"]').exists()).toBe(true)
    })

    it('renders start and end date pickers', () => {
      const wrapper = createWrapper()

      const startDatePicker = wrapper.find('[data-test="start-date-picker"]')
      const endDatePicker = wrapper.find('[data-test="end-date-picker"]')

      expect(startDatePicker.exists()).toBe(true)
      expect(endDatePicker.exists()).toBe(true)
      expect(startDatePicker.findComponent(VueDatePicker).exists()).toBe(true)
      expect(endDatePicker.findComponent(VueDatePicker).exists()).toBe(true)
    })

    it('renders action buttons', () => {
      const wrapper = createWrapper()

      const cancelButton = wrapper.find('[data-test="cancel-button"]')
      const approveButton = wrapper.find('[data-test="approve-button"]')

      expect(cancelButton.exists()).toBe(true)
      expect(approveButton.exists()).toBe(true)
      expect(cancelButton.findComponent(ButtonUI).exists()).toBe(true)
      expect(approveButton.findComponent(ButtonUI).exists()).toBe(true)
    })

    it('shows loading state on approve button when loadingApprove is true', () => {
      const wrapper = createWrapper({ loadingApprove: true })

      const approveButton = wrapper.find('[data-test="approve-button"]').findComponent(ButtonUI)
      expect(approveButton.props('loading')).toBe(true)
      expect(approveButton.props('disabled')).toBe(true)
    })
  })

  describe('User Interactions', () => {
    it('updates amount when user inputs value', async () => {
      const wrapper = createWrapper()
      const amountInput = wrapper.find('[data-test="amount-input"]')

      await amountInput.setValue(1500)

      expect(wrapper.vm.amount).toBe(1500)
    })

    it('updates frequencyType when user selects from dropdown', async () => {
      const wrapper = createWrapper()
      const selectComponent = wrapper.findComponent(SelectComponent)

      await selectComponent.vm.$emit('update:modelValue', 2) // Weekly

      expect(wrapper.vm.frequencyType).toBe(2)
    })

    it('updates customFrequencyDays when user inputs value and frequencyType is Custom', async () => {
      const wrapper = createWrapper()
      wrapper.vm.frequencyType = 4
      await flushPromises()
      const customFrequencyInput = wrapper.find('[data-test="custom-frequency-input"]')
      await customFrequencyInput.setValue(14)

      expect(wrapper.vm.customFrequencyDays).toBe(14)
    })

    it('updates description when user inputs value and isBodAction is true', async () => {
      const wrapper = createWrapper({ isBodAction: true })
      const descriptionInput = wrapper.find('[data-test="description-input"]')

      await descriptionInput.setValue('Test description')

      expect(wrapper.vm.description).toBe('Test description')
    })

    it('updates startDate when user selects date', async () => {
      const wrapper = createWrapper()
      const startDatePicker = wrapper
        .find('[data-test="start-date-picker"]')
        .findComponent(VueDatePicker)
      const testDate = new Date('2024-01-01')

      await startDatePicker.vm.$emit('update:modelValue', testDate)

      expect(wrapper.vm.startDate).toBe(testDate)
    })

    it('updates endDate when user selects date', async () => {
      const wrapper = createWrapper()
      const endDatePicker = wrapper
        .find('[data-test="end-date-picker"]')
        .findComponent(VueDatePicker)
      const testDate = new Date('2024-01-31')

      await endDatePicker.vm.$emit('update:modelValue', testDate)

      expect(wrapper.vm.endDate).toBe(testDate)
    })
  })

  describe('Validation', () => {
    it('shows validation errors when form is submitted empty', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="approve-button"]').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.v$.$invalid).toBe(true)
      expect(wrapper.find('[data-test="address-error"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="amount-error"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="start-date-error"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="end-date-error"]').exists()).toBe(true)
    })

    it('shows description error when isBodAction is true and description is empty', async () => {
      const wrapper = createWrapper({ isBodAction: true })

      await wrapper.find('[data-test="approve-button"]').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="description-error"]').exists()).toBe(true)
    })

    it('shows custom frequency error when frequencyType is Custom and customFrequencyDays is empty', async () => {
      const wrapper = createWrapper()
      wrapper.vm.frequencyType = 4
      wrapper.vm.customFrequencyDays = 0

      await wrapper.find('[data-test="approve-button"]').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="custom-frequency-error"]').exists()).toBe(true)
    })

    it('passes validation when all required fields are filled', async () => {
      const wrapper = createWrapper()

      // Set valid form data
      wrapper.vm.input = {
        name: 'Test User',
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        token: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92267'
      }
      wrapper.vm.amount = 1000
      wrapper.vm.frequencyType = 1 // Daily
      wrapper.vm.startDate = new Date(Date.now() + 86400000) // Tomorrow
      wrapper.vm.endDate = new Date(Date.now() + 86400000 * 7) // One week from now

      await flushPromises()

      await wrapper.find('[data-test="approve-button"]').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.v$.$invalid).toBe(false)
    })
  })

  describe('Methods', () => {
    it('clears form data when clear method is called', async () => {
      const wrapper = createWrapper()

      // Set some data first
      wrapper.vm.amount = 1000
      wrapper.vm.frequencyType = 2
      wrapper.vm.customFrequencyDays = 14
      wrapper.vm.startDate = new Date()
      wrapper.vm.endDate = new Date()
      wrapper.vm.description = 'Test description'

      wrapper.vm.clear()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.amount).toBe(0)
      expect(wrapper.vm.frequencyType).toBe(0)
      expect(wrapper.vm.customFrequencyDays).toBe(7)
      expect(wrapper.vm.startDate).toBe('')
      expect(wrapper.vm.endDate).toBe('')
    })

    it('emits closeModal event when clear method is called', async () => {
      const wrapper = createWrapper()

      wrapper.vm.clear()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })

    it('calls submitApprove and emits approveUser with correct data when form is valid', async () => {
      const wrapper = createWrapper()

      const startDate = new Date(Date.now() + 86400000) // new Date('2024-01-01')
      const endDate = new Date(Date.now() + 86400000 * 7) // new Date('2024-01-31')

      wrapper.vm.input = {
        name: 'Test User',
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        token: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92267'
      }
      wrapper.vm.amount = 1500
      wrapper.vm.frequencyType = 4 // Custom
      wrapper.vm.customFrequencyDays = 10
      wrapper.vm.startDate = startDate
      wrapper.vm.endDate = endDate

      await flushPromises()

      wrapper.vm.submitApprove()
      await wrapper.vm.$nextTick()
      await flushPromises()

      expect(wrapper.emitted('approveUser')).toBeTruthy()

      const emittedData = wrapper.emitted('approveUser')![0][0]
      expect(emittedData).toEqual({
        approvedAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: 1500,
        frequencyType: 4,
        customFrequency: 10 * 24 * 60 * 60, // 10 days in seconds
        startDate: Math.floor(startDate.getTime() / 1000),
        endDate: Math.floor(endDate.getTime() / 1000),
        tokenAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92267'
      })
    })

    it('does not emit approveUser when form is invalid', async () => {
      const wrapper = createWrapper()

      // Don't set any data, form should be invalid
      wrapper.vm.submitApprove()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('approveUser')).toBeFalsy()
    })
  })

  describe('Computed Properties', () => {
    it('correctly converts customFrequencyDays to seconds', async () => {
      const wrapper = createWrapper()

      wrapper.vm.customFrequencyDays = 7

      expect(wrapper.vm.customFrequencyInSeconds).toBe(7 * 24 * 60 * 60)

      wrapper.vm.customFrequencyDays = 30

      expect(wrapper.vm.customFrequencyInSeconds).toBe(30 * 24 * 60 * 60)
    })
  })

  describe('Frequency Types', () => {
    it('has correct frequency types configuration', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.frequencyTypes).toEqual([
        { value: 0, label: 'One Time' },
        { value: 1, label: 'Daily' },
        { value: 2, label: 'Weekly' },
        { value: 3, label: 'Monthly' },
        { value: 4, label: 'Custom' }
      ])
    })

    it('sets customFrequency to 0 for non-custom frequency types', async () => {
      const wrapper = createWrapper()

      const startDate = new Date(Date.now() + 86400000) // new Date('2024-01-01')
      const endDate = new Date(Date.now() + 86400000 * 7) // new Date('2024-01-31')

      wrapper.vm.input = {
        name: 'Test User',
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        token: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92267'
      }
      wrapper.vm.frequencyType = 1 // Daily
      wrapper.vm.amount = 1000
      wrapper.vm.startDate = startDate
      wrapper.vm.endDate = endDate

      await flushPromises()

      wrapper.vm.submitApprove()
      await wrapper.vm.$nextTick()

      const emittedData = wrapper.emitted('approveUser')![0][0] as {
        approvedAddress: string
        amount: number
        frequencyType: number
        customFrequency: number
        startDate: number
        endDate: number
        tokenAddress: string
      }
      expect(emittedData.customFrequency).toBe(0)
    })

    it('sets customFrequency to calculated seconds for custom frequency type', async () => {
      const wrapper = createWrapper()

      const startDate = new Date(Date.now() + 86400000) // new Date('2024-01-01')
      const endDate = new Date(Date.now() + 86400000 * 7) // new Date('2024-01-31')

      wrapper.vm.input = {
        name: 'Test User',
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        token: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92267'
      }
      wrapper.vm.frequencyType = 4 // Custom
      wrapper.vm.customFrequencyDays = 15
      wrapper.vm.amount = 1000
      wrapper.vm.startDate = startDate
      wrapper.vm.endDate = endDate

      await flushPromises()

      wrapper.vm.submitApprove()
      await wrapper.vm.$nextTick()

      const emittedData = wrapper.emitted('approveUser')![0][0] as {
        approvedAddress: string
        amount: number
        frequencyType: number
        customFrequency: number
        startDate: number
        endDate: number
        tokenAddress: string
      }
      expect(emittedData.customFrequency).toBe(15 * 24 * 60 * 60)
    })
  })
})

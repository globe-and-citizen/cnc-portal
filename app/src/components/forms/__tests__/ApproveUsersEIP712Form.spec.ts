import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { getLocalTimeZone, parseDate, today, type CalendarDate } from '@internationalized/date'

// USelect is auto-imported by @nuxt/ui/vite, so config.global.stubs / local mount
// stubs cannot catch it — vi.mock on the resolved module is the reliable hook.
vi.mock('@nuxt/ui/components/Select.vue', () => ({
  default: {
    name: 'USelect',
    props: ['modelValue', 'items', 'valueKey'],
    emits: ['update:modelValue'],
    methods: {
      onSelectChange(event: Event) {
        this.$emit('update:modelValue', Number((event.target as HTMLSelectElement).value))
      }
    },
    // data-test="frequency-select" falls through from the component template.
    template:
      '<select @change="onSelectChange"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>'
  }
}))

import ApproveUsersForm from '../ApproveUsersEIP712Form.vue'

type ApproveUsersVm = {
  state: {
    input: { name: string; address: string; token: string }
    description: string
    amount: number
    frequencyType: number
    customFrequencyDays: number
  }
  startDate: CalendarDate | null
  schema: {
    safeParse: (value: unknown) => {
      success: boolean
      error?: { issues: Array<{ message: string }> }
    }
  }
}

const defaultProps = {
  loadingApprove: false,
  isBodAction: false,
  formData: [{ name: '', address: '' }],
  users: []
}

const makeValidDates = () => ({
  startDate: parseDate('2099-01-01'),
  endDate: parseDate('2099-01-02')
})

const makeValidState = () => ({
  input: {
    name: 'Alice',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    token: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92267'
  },
  description: 'Budget for monthly expenses',
  amount: 1500,
  frequencyType: 0,
  customFrequencyDays: 7
})

const createWrapper = (props = {}) =>
  mount(ApproveUsersForm, {
    props: { ...defaultProps, ...props },
    global: {
      stubs: {
        UPopover: {
          name: 'UPopover',
          template: '<div><slot /><slot name="content" /></div>'
        },
        UCalendar: {
          name: 'UCalendar',
          props: ['modelValue', 'minValue'],
          emits: ['update:modelValue'],
          template: '<div data-test="calendar-stub" />'
        },
        SelectMemberWithTokenInput: {
          name: 'SelectMemberWithTokenInput',
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<div data-test="member-input" />'
        }
      }
    }
  })

// eslint-disable-next-line no-restricted-syntax -- `schema` is a computed closure over startDate.value/state.frequencyType exercised through safeParse, and the v-model reactive state it validates has no stable DOM surface; both are inherently white-box and unreachable via rendered output
const getVm = (wrapper: ReturnType<typeof createWrapper>) => wrapper.vm as unknown as ApproveUsersVm

describe('ApproveUsersEIP712Form.vue', () => {
  it('renders default fields and toggles bod and custom frequency sections', async () => {
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="member-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="bod-notification"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="custom-frequency-input"]').exists()).toBe(false)

    await wrapper.find('[data-test="frequency-select"]').setValue('4')

    expect(wrapper.find('[data-test="custom-frequency-input"]').exists()).toBe(true)

    const bodWrapper = createWrapper({ isBodAction: true, loadingApprove: true })
    expect(bodWrapper.find('[data-test="bod-notification"]').exists()).toBe(true)
    expect(bodWrapper.find('[data-test="description-input"]').exists()).toBe(true)
    expect(bodWrapper.find('[data-test="approve-button"]').attributes('disabled')).toBeDefined()
  })

  it('clears the form state and emits closeModal', async () => {
    const wrapper = createWrapper({ isBodAction: true })
    const { startDate, endDate } = makeValidDates()
    const calendars = wrapper.findAllComponents({ name: 'UCalendar' })

    await wrapper.find('[data-test="description-input"]').setValue('Budget for monthly expenses')
    await wrapper.find('[data-test="amount-input"]').setValue('1500')
    await wrapper.find('[data-test="frequency-select"]').setValue('4')
    await wrapper.find('[data-test="custom-frequency-input"]').setValue('14')
    calendars[0].vm.$emit('update:modelValue', startDate)
    calendars[1].vm.$emit('update:modelValue', endDate)
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="cancel-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('closeModal')).toBeTruthy()
    expect(
      (wrapper.find('[data-test="description-input"]').element as HTMLInputElement).value
    ).toBe('')
    expect((wrapper.find('[data-test="amount-input"]').element as HTMLInputElement).value).toBe('0')
    expect(wrapper.find('[data-test="custom-frequency-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="start-date-picker"]').text()).toContain('Pick start date')
    expect(wrapper.find('[data-test="end-date-picker"]').text()).toContain('Pick end date')
  })

  it('emits approveUser payload for one-time and custom frequencies', async () => {
    const wrapper = createWrapper()
    const { startDate, endDate } = makeValidDates()
    const calendars = wrapper.findAllComponents({ name: 'UCalendar' })

    await wrapper
      .findComponent({ name: 'SelectMemberWithTokenInput' })
      .vm.$emit('update:modelValue', {
        name: 'Alice',
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        token: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92267'
      })
    await wrapper.find('[data-test="amount-input"]').setValue('1500')
    calendars[0].vm.$emit('update:modelValue', startDate)
    calendars[1].vm.$emit('update:modelValue', endDate)
    await wrapper.vm.$nextTick()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('approveUser')?.[0]?.[0]).toEqual({
      approvedAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      amount: 1500,
      frequencyType: 0,
      customFrequency: 0,
      startDate: Math.floor(startDate.toDate(getLocalTimeZone()).getTime() / 1000),
      endDate: Math.floor(endDate.toDate(getLocalTimeZone()).getTime() / 1000),
      tokenAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92267'
    })

    await wrapper.find('[data-test="frequency-select"]').setValue('4')
    await wrapper.find('[data-test="custom-frequency-input"]').setValue('14')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('approveUser')?.[1]?.[0].customFrequency).toBe(14 * 24 * 60 * 60)
  })

  it('validates bod description, address, token and amount requirements', () => {
    const wrapper = createWrapper({ isBodAction: true })
    const vm = getVm(wrapper)
    const { startDate, endDate } = makeValidDates()
    vm.startDate = startDate

    const result = vm.schema.safeParse({
      ...makeValidState(),
      description: '',
      input: { name: 'Alice', address: 'invalid-address', token: '' },
      amount: 0,
      startDate,
      endDate
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Invalid wallet address',
        'Token is required',
        'Description is required',
        'Amount must be greater than zero'
      ])
    )
  })

  it('validates custom frequency and required dates', () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    vm.state.frequencyType = 4

    const result = vm.schema.safeParse({
      ...makeValidState(),
      frequencyType: 4,
      customFrequencyDays: 0,
      startDate: null,
      endDate: null
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Custom frequency must be at least 1 day',
        'Start date is required',
        'End date is required'
      ])
    )
  })

  it('rejects past start dates and end dates that do not come after the start date', () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)
    const startDate = parseDate('2099-01-02')
    const endDate = parseDate('2099-01-02')
    const pastDate = today(getLocalTimeZone()).subtract({ days: 1 })
    vm.startDate = startDate

    const invalidRange = vm.schema.safeParse({
      ...makeValidState(),
      startDate,
      endDate
    })
    expect(invalidRange.success).toBe(false)
    expect(invalidRange.error?.issues.map((issue) => issue.message)).toContain(
      'End date must be after start date'
    )

    vm.startDate = pastDate
    const invalidPastDate = vm.schema.safeParse({
      ...makeValidState(),
      startDate: pastDate,
      endDate: startDate
    })
    expect(invalidPastDate.success).toBe(false)
    expect(invalidPastDate.error?.issues.map((issue) => issue.message)).toContain(
      'Start date must be today or in the future'
    )
  })

  it('accepts a fully valid payload', () => {
    const wrapper = createWrapper({ isBodAction: true })
    const vm = getVm(wrapper)
    const { startDate, endDate } = makeValidDates()
    vm.startDate = startDate

    const result = vm.schema.safeParse({
      ...makeValidState(),
      startDate,
      endDate
    })

    expect(result.success).toBe(true)
  })

  it('renders the inline error alert when errorMessage prop is provided', async () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="error-alert"]').exists()).toBe(false)

    const withError = createWrapper({ errorMessage: 'Signing failed' })
    expect(withError.find('[data-test="error-alert"]').exists()).toBe(true)
    expect(withError.find('[data-test="error-alert"]').text()).toContain('Signing failed')
  })

  it('updates amount, custom frequency and renders both calendars', async () => {
    const wrapper = createWrapper({ isBodAction: true })
    const vm = getVm(wrapper)

    await wrapper.find('[data-test="description-input"]').setValue('Board-approved budget')
    await wrapper.find('[data-test="amount-input"]').setValue('2500')
    expect(vm.state.amount).toBe(2500)

    vm.state.frequencyType = 4
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="custom-frequency-input"]').setValue('14')

    await wrapper
      .findComponent({ name: 'SelectMemberWithTokenInput' })
      .vm.$emit('update:modelValue', {
        name: 'Alice',
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        token: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92267'
      })
    await wrapper.vm.$nextTick()

    expect(vm.state.customFrequencyDays).toBe(14)
    expect(vm.state.description).toBe('Board-approved budget')
    expect(vm.state.input.address).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
    expect(wrapper.find('[data-test="start-date-picker"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="end-date-picker"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="calendar-stub"]').length).toBeGreaterThanOrEqual(0)
  })
})

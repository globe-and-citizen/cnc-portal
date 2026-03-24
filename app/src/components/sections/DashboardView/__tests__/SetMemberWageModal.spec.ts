import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent, h, ref } from 'vue'
import SetMemberWageModal from '../SetMemberWageModal.vue'
import { useSetMemberWageMutation } from '@/queries/wage.queries'

type WageRateVm = {
  type: string
  amount: number
  enabled: boolean
}

type SetMemberWageModalVm = {
  showModal: boolean
  currentStep: number
  isSaving: boolean
  wageData: {
    enableOvertimeRules: boolean
    maximumHoursPerWeek: number
    maximumOvertimeHoursPerWeek?: number
    ratePerHour: WageRateVm[]
    overtimeRatePerHour: WageRateVm[]
  }
  handlePrimaryAction: () => Promise<void>
  handleResetWage: () => void
  submitWage: () => void
  handleBackStep: () => void
  $nextTick: () => Promise<void>
}

const mockMember = { address: '0x123', name: 'Alice' }
const mockTeamId = 1
const mockWage = {
  id: 1,
  teamId: 1,
  userAddress: '0x123',
  ratePerHour: [
    { type: 'native', amount: 10 },
    { type: 'usdc', amount: 0 },
    { type: 'sher', amount: 0 }
  ],
  overtimeRatePerHour: [
    { type: 'native', amount: 0 },
    { type: 'usdc', amount: 0 },
    { type: 'sher', amount: 0 }
  ],
  maximumHoursPerWeek: 40,
  nextWageId: null,
  createdAt: '',
  updatedAt: ''
}

describe('SetMemberWageModal', () => {
  let standardStepIsValid = true
  let overtimeStepIsValid = true
  const toastAddMock = vi.fn()
  const mutationError = ref<unknown>(null)
  const mutateSpy = vi.fn()

  const StandardStepStub = defineComponent({
    name: 'SetMemberWageStandardStep',
    props: {
      wageData: {
        type: Object,
        required: true
      }
    },
    emits: ['update:wageData'],
    setup(_props, { expose }) {
      expose({
        validateForm: () => standardStepIsValid
      })

      return () => h('div', { 'data-test': 'standard-step' })
    }
  })

  const OvertimeStepStub = defineComponent({
    name: 'SetMemberWageOvertimeStep',
    props: {
      wageData: {
        type: Object,
        required: true
      }
    },
    emits: ['update:wageData'],
    setup(_props, { expose }) {
      expose({
        validateForm: () => overtimeStepIsValid
      })

      return () => h('div', { 'data-test': 'overtime-step' })
    }
  })

  const createWrapper = (props = {}) =>
    mount(SetMemberWageModal, {
      attachTo: document.body,
      props: {
        member: mockMember,
        teamId: mockTeamId,
        wage: mockWage,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          UModal: { template: '<div><slot /><slot name="header" /><slot name="body" /></div>' },
          UButton: {
            template:
              '<button v-bind="$attrs" @click="$emit(\'click\')"><slot />{{ $attrs.label || "" }}</button>'
          },
          UStepper: { template: '<div />' },
          UAlert: {
            props: ['description'],
            template: '<div data-test="alert-description">{{ description }}</div>'
          },
          SetMemberWageStandardStep: StandardStepStub,
          SetMemberWageOvertimeStep: OvertimeStepStub
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    standardStepIsValid = true
    overtimeStepIsValid = true
    mutationError.value = null

    vi.stubGlobal(
      'useToast',
      vi.fn(() => ({ add: toastAddMock }))
    )

    mutateSpy.mockImplementation((_payload, options) => {
      options?.onSuccess?.()
      options?.onSettled?.()
    })

    vi.mocked(useSetMemberWageMutation).mockReturnValue({
      mutate: mutateSpy,
      error: mutationError
    } as ReturnType<typeof useSetMemberWageMutation>)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  const openModal = async (wrapper: ReturnType<typeof createWrapper>) => {
    await wrapper.find('[data-test="set-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()
  }

  const getVm = (wrapper: ReturnType<typeof createWrapper>) =>
    wrapper.vm as unknown as SetMemberWageModalVm

  it('renders modal and wage button', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="set-wage-button"]').exists()).toBe(true)
  })

  it('opens modal on button click', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-test="set-wage-button"]').trigger('click')
    const vm = getVm(wrapper)
    expect(vm.showModal).toBe(true)
  })

  it('calls handleCancel on close button and resets state', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)
    await openModal(wrapper)

    vm.isSaving = true
    vm.currentStep = 1
    await vm.$nextTick()

    const closeBtn = document.body.querySelector(
      '[data-test="close-wage-modal-button"]'
    ) as HTMLButtonElement | null
    expect(closeBtn).not.toBeNull()

    closeBtn?.click()
    await vm.$nextTick()

    expect(vm.showModal).toBe(false)
    expect(vm.isSaving).toBe(false)
    expect(vm.currentStep).toBe(0)
  })

  it('shows error alert if setWageError is set', async () => {
    mutationError.value = { response: { data: { message: 'fail' } } }
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    await openModal(wrapper)
    await vm.$nextTick()

    const errorState = document.body.querySelector('[data-test="error-state"]')

    expect(errorState).not.toBeNull()
  })

  it('resets wage data on handleResetWage', () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    vm.wageData.ratePerHour[0].amount = 99
    vm.wageData.ratePerHour[0].enabled = false
    vm.wageData.enableOvertimeRules = true

    vm.handleResetWage()

    expect(vm.wageData.ratePerHour[0].amount).toBe(10)
    expect(vm.wageData.ratePerHour[0].enabled).toBe(true)
    expect(vm.wageData.enableOvertimeRules).toBe(false)
  })

  it('goes to overtime step instead of submitting on step 0 when overtime is enabled', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)
    await openModal(wrapper)

    vm.wageData.enableOvertimeRules = true

    await vm.handlePrimaryAction()

    expect(vm.currentStep).toBe(1)
    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('does not continue when current step validation fails', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)
    await openModal(wrapper)
    standardStepIsValid = false
    vm.wageData.enableOvertimeRules = false

    await vm.handlePrimaryAction()

    expect(vm.currentStep).toBe(0)
    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('returns early in submitWage when already saving', () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    vm.currentStep = 1
    vm.isSaving = true
    vm.submitWage()

    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('handles back step action', () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    vm.currentStep = 1
    vm.handleBackStep()

    expect(vm.currentStep).toBe(0)
  })

  it('submits wage and emits wageUpdated while resetting modal state', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)
    await openModal(wrapper)

    vm.currentStep = 1
    await vm.$nextTick()
    vm.wageData.maximumHoursPerWeek = 42
    vm.wageData.maximumOvertimeHoursPerWeek = 7
    vm.wageData.enableOvertimeRules = true
    vm.wageData.ratePerHour = [
      { type: 'native', amount: 10, enabled: true },
      { type: 'usdc', amount: 0, enabled: true },
      { type: 'sher', amount: 4, enabled: false }
    ]
    vm.wageData.overtimeRatePerHour = [
      { type: 'native', amount: 20, enabled: true },
      { type: 'usdc', amount: 0, enabled: false },
      { type: 'sher', amount: 1, enabled: true }
    ]

    await vm.handlePrimaryAction()

    expect(mutateSpy).toHaveBeenCalledTimes(1)

    const [payload] = mutateSpy.mock.calls[0]
    expect(payload.body).toEqual({
      teamId: mockTeamId,
      userAddress: mockMember.address,
      ratePerHour: [{ type: 'native', amount: 10 }],
      overtimeRatePerHour: [
        { type: 'native', amount: 20 },
        { type: 'sher', amount: 1 }
      ],
      maximumOvertimeHoursPerWeek: 7,
      maximumHoursPerWeek: 42
    })

    expect(wrapper.emitted('wageUpdated')).toBeTruthy()
    expect(vm.showModal).toBe(false)
    expect(vm.currentStep).toBe(0)
    expect(vm.isSaving).toBe(false)
  })

  it('calls error callback when mutation fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    mutateSpy.mockImplementationOnce((_payload, options) => {
      options?.onError?.({ message: 'network issue' })
      options?.onSettled?.()
    })

    const wrapper = createWrapper()
    const vm = getVm(wrapper)
    await openModal(wrapper)
    vm.currentStep = 1
    await vm.$nextTick()

    await vm.handlePrimaryAction()

    expect(errorSpy).toHaveBeenCalled()
    expect(vm.isSaving).toBe(false)

    errorSpy.mockRestore()
  })
})

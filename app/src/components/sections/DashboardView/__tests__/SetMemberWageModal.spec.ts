import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent, h } from 'vue'
import SetMemberWageModal from '../SetMemberWageModal.vue'
import { useSetMemberWageMutation } from '@/queries/wage.queries'
import { createMockMutationResponse, mountWithProviders } from '@/tests/mocks'

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

describe.skip('SetMemberWageModal', () => {
  let standardStepIsValid = true
  let overtimeStepIsValid = true
  let mutateSpy: ReturnType<typeof vi.fn>

  // Locally-imported sub-components are stubbed to expose validateForm and avoid
  // loading their heavy dependencies (contract address resolution etc.).
  const StandardStepStub = defineComponent({
    name: 'SetMemberWageStandardStep',
    props: { wageData: { type: Object, required: true } },
    emits: ['update:wageData'],
    setup(_props, { expose }) {
      expose({ validateForm: () => standardStepIsValid })
      return () => h('div', { 'data-test': 'standard-step' })
    }
  })

  const OvertimeStepStub = defineComponent({
    name: 'SetMemberWageOvertimeStep',
    props: { wageData: { type: Object, required: true } },
    emits: ['update:wageData'],
    setup(_props, { expose }) {
      expose({ validateForm: () => overtimeStepIsValid })
      return () => h('div', { 'data-test': 'overtime-step' })
    }
  })

  const createWrapper = (props = {}) =>
    mountWithProviders(SetMemberWageModal, {
      props: {
        member: mockMember,
        teamId: mockTeamId,
        wage: mockWage,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          UButton: { template: '<button v-bind="$attrs"><slot />{{ $attrs.label }}</button>' },
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
    mutateSpy = vi.fn()

    vi.stubGlobal('useToast', vi.fn(() => ({ add: vi.fn() })))

    vi.mocked(useSetMemberWageMutation).mockReturnValue({
      ...createMockMutationResponse(),
      mutate: mutateSpy
    } as ReturnType<typeof useSetMemberWageMutation>)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const openModal = async (wrapper: ReturnType<typeof createWrapper>) => {
    await wrapper.find('[data-test="set-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()
  }

  it('renders the Set Wage trigger button', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="set-wage-button"]').exists()).toBe(true)
  })

  it('shows modal content when Set Wage button is clicked', async () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(false)

    await openModal(wrapper)

    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="add-wage-button"]').exists()).toBe(true)
  })

  it('hides modal when the header close button is clicked', async () => {
    const wrapper = createWrapper()
    await openModal(wrapper)
    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(true)

    await wrapper.find('[data-test="close-wage-modal-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(false)
  })

  it('hides modal when the Cancel button is clicked', async () => {
    const wrapper = createWrapper()
    await openModal(wrapper)

    await wrapper.find('[data-test="add-wage-cancel-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(false)
  })

  it('advances to the overtime step when overtime is enabled and Next is clicked', async () => {
    const wrapper = createWrapper()
    await openModal(wrapper)

    wrapper.vm.wageData.enableOvertimeRules = true
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="overtime-step"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(false)
    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('returns to standard step when Back is clicked on the overtime step', async () => {
    const wrapper = createWrapper()
    await openModal(wrapper)

    wrapper.vm.wageData.enableOvertimeRules = true
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="overtime-step"]').exists()).toBe(true)

    await wrapper.find('[data-test="back-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="overtime-step"]').exists()).toBe(false)
  })

  it('does not call mutation and stays on current step when validation fails', async () => {
    standardStepIsValid = false
    const wrapper = createWrapper()
    await openModal(wrapper)

    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(true)
    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('calls mutation with member, team, and wage data when Save is clicked', async () => {
    const wrapper = createWrapper()
    await openModal(wrapper)

    await wrapper.find('[data-test="add-wage-button"]').trigger('click')

    expect(mutateSpy).toHaveBeenCalledOnce()
    expect(mutateSpy.mock.calls[0][0].body).toEqual({
      teamId: mockTeamId,
      userAddress: mockMember.address,
      ratePerHour: [{ type: 'native', amount: 10 }],
      overtimeRatePerHour: null,
      maximumOvertimeHoursPerWeek: null,
      maximumHoursPerWeek: mockWage.maximumHoursPerWeek
    })
  })

  it('emits wageUpdated and closes modal after mutation succeeds', async () => {
    mutateSpy.mockImplementation((_payload, options) => {
      options?.onSuccess?.()
    })

    const wrapper = createWrapper()
    await openModal(wrapper)
    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('wageUpdated')).toBeTruthy()
    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(false)
  })

  it('keeps the modal open and logs an error when mutation fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mutateSpy.mockImplementation((_payload, options) => {
      options?.onError?.({ message: 'network issue' })
    })

    const wrapper = createWrapper()
    await openModal(wrapper)
    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(true)
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it('shows an error alert when the mutation returns an error', async () => {
    vi.mocked(useSetMemberWageMutation).mockReturnValueOnce(
      createMockMutationResponse(
        null,
        false,
        new Error('Network error')
      ) as ReturnType<typeof useSetMemberWageMutation>
    )

    const wrapper = createWrapper()
    await openModal(wrapper)

    expect(wrapper.find('[data-test="error-state"]').exists()).toBe(true)
  })

  it('disables the primary action button while mutation is pending', async () => {
    vi.mocked(useSetMemberWageMutation).mockReturnValueOnce(
      createMockMutationResponse(null, true) as ReturnType<typeof useSetMemberWageMutation>
    )

    const wrapper = createWrapper()
    await openModal(wrapper)

    expect(wrapper.find('[data-test="add-wage-button"]').attributes('disabled')).toBeDefined()
  })

  it('prevents calling mutation while a previous submission is in flight', async () => {
    vi.mocked(useSetMemberWageMutation).mockReturnValueOnce({
      ...createMockMutationResponse(null, true),
      mutate: mutateSpy
    } as ReturnType<typeof useSetMemberWageMutation>)

    const wrapper = createWrapper()
    await openModal(wrapper)
    await wrapper.find('[data-test="add-wage-button"]').trigger('click')

    expect(mutateSpy).not.toHaveBeenCalled()
  })
})

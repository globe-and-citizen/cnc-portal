import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent } from 'vue'
import SetMemberWageModal from '../SetMemberWageModal.vue'
import { useSetMemberWageMutation } from '@/queries/wage.queries'
import { createMockMutationResponse } from '@/tests/mocks'
import { addToastSpy } from '@/tests/setup/nuxt-ui.setup'

const mockMember = { address: '0x123', name: 'Alice' }
const mockTeamId = 1
const mockWage = {
  id: 1,
  teamId: 1,
  userAddress: '0x123',
  disabled: false,
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
  let mutateSpy: ReturnType<typeof vi.fn>

  // Sub-components are stubbed with the same event API as the real components
  // (@validated / @cancel / @back) to keep the modal's orchestration logic
  // exercisable without pulling in Zod schemas or network-dependent constants.
  const StandardStepStub = defineComponent({
    name: 'SetMemberWageStandardStep',
    props: {
      wageData: { type: Object, required: true },
      isPending: { type: Boolean, default: false },
      wage: Object,
      errorMessage: String
    },
    emits: ['update:wageData', 'validated', 'cancel', 'reset'],
    template: `
      <div data-test="standard-step">
        <button
          data-test="add-wage-button"
          :disabled="isPending || undefined"
          @click="$emit('validated')"
        >Save</button>
        <button data-test="add-wage-cancel-button" @click="$emit('cancel')">Cancel</button>
        <div v-if="errorMessage" data-test="error-state">{{ errorMessage }}</div>
      </div>
    `
  })

  const OvertimeStepStub = defineComponent({
    name: 'SetMemberWageOvertimeStep',
    props: {
      wageData: { type: Object, required: true },
      isPending: { type: Boolean, default: false },
      errorMessage: String
    },
    emits: ['update:wageData', 'validated', 'back'],
    template: `
      <div data-test="overtime-step">
        <button
          data-test="save-overtime-wage-button"
          :disabled="isPending || undefined"
          @click="$emit('validated')"
        >Save</button>
        <button data-test="back-wage-button" @click="$emit('back')">Back</button>
        <div v-if="errorMessage" data-test="error-state">{{ errorMessage }}</div>
      </div>
    `
  })

  const createWrapper = (props = {}) =>
    mount(SetMemberWageModal, {
      props: {
        member: mockMember,
        teamId: mockTeamId,
        wage: mockWage,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          UStepper: true,
          UTooltip: { template: '<div><slot /></div>' },
          SetMemberWageStandardStep: StandardStepStub,
          SetMemberWageOvertimeStep: OvertimeStepStub
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mutateSpy = vi.fn()

    vi.mocked(useSetMemberWageMutation).mockReturnValue({
      ...createMockMutationResponse(),
      mutate: mutateSpy
    } as ReturnType<typeof useSetMemberWageMutation>)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const openModal = async (wrapper: ReturnType<typeof createWrapper>) => {
    await wrapper.find('[data-test="set-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()
  }

  // --- Trigger button ---

  it('renders the Set Wage trigger button', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="set-wage-button"]').exists()).toBe(true)
  })

  it('disables the trigger button when the wage is marked as disabled', () => {
    const wrapper = createWrapper({ wage: { ...mockWage, disabled: true } })
    expect(wrapper.find('[data-test="set-wage-button"]').attributes('disabled')).toBeDefined()
  })

  // --- Modal open / close ---

  it('shows the standard step when the trigger button is clicked', async () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(false)

    await openModal(wrapper)

    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(true)
  })

  it('hides modal when the header close button is clicked', async () => {
    const wrapper = createWrapper()
    await openModal(wrapper)

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

  // --- Step navigation ---

  it('advances to the overtime step when overtime is enabled and standard step is submitted', async () => {
    const wrapper = createWrapper()
    await openModal(wrapper)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).wageData.enableOvertimeRules = true
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).wageData.enableOvertimeRules = true
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="back-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="overtime-step"]').exists()).toBe(false)
  })

  it('resets to the standard step and clears data when the modal is closed and reopened', async () => {
    const wrapper = createWrapper()
    await openModal(wrapper)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).wageData.enableOvertimeRules = true
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="overtime-step"]').exists()).toBe(true)

    // Close then reopen
    await wrapper.find('[data-test="close-wage-modal-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    await openModal(wrapper)

    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="overtime-step"]').exists()).toBe(false)
  })

  // --- Mutation: standard flow ---

  it('calls mutation with correct payload when standard step is submitted without overtime', async () => {
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

  it('calls mutation with overtime payload when overtime step is submitted', async () => {
    const wrapper = createWrapper()
    await openModal(wrapper)

    // Configure overtime rates directly on the reactive wage state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vm = wrapper.vm as any
    vm.wageData.enableOvertimeRules = true
    vm.wageData.overtimeRatePerHour[1].enabled = true // usdc
    vm.wageData.overtimeRatePerHour[1].amount = 20
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="save-overtime-wage-button"]').trigger('click')

    expect(mutateSpy).toHaveBeenCalledOnce()
    expect(mutateSpy.mock.calls[0][0].body).toMatchObject({
      teamId: mockTeamId,
      userAddress: mockMember.address,
      overtimeRatePerHour: [{ type: 'usdc', amount: 20 }]
    })
  })

  // --- Mutation: success / failure ---

  it.skip('shows a success toast and closes the modal after mutation succeeds', async () => {
    mutateSpy.mockImplementation((_payload: unknown, options: { onSuccess?: () => void }) => {
      options?.onSuccess?.()
    })

    const wrapper = createWrapper()
    await openModal(wrapper)
    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(addToastSpy).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(false)
  })

  it('keeps the modal open and logs an error when mutation fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mutateSpy.mockImplementation(
      (_payload: unknown, options: { onError?: (e: unknown) => void }) => {
        options?.onError?.({ message: 'network issue' })
      }
    )

    const wrapper = createWrapper()
    await openModal(wrapper)
    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(true)
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it('shows an error message in the step when the mutation has an active error', async () => {
    vi.mocked(useSetMemberWageMutation).mockReturnValueOnce(
      createMockMutationResponse(null, false, new Error('Network error')) as ReturnType<
        typeof useSetMemberWageMutation
      >
    )

    const wrapper = createWrapper()
    await openModal(wrapper)

    expect(wrapper.find('[data-test="error-state"]').exists()).toBe(true)
  })

  // --- Pending state ---

  it('disables the action button in the step while mutation is pending', async () => {
    vi.mocked(useSetMemberWageMutation).mockReturnValueOnce(
      createMockMutationResponse(null, true) as ReturnType<typeof useSetMemberWageMutation>
    )

    const wrapper = createWrapper()
    await openModal(wrapper)

    expect(wrapper.find('[data-test="add-wage-button"]').attributes('disabled')).toBeDefined()
  })

  it('does not call mutation when a previous submission is in flight', async () => {
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

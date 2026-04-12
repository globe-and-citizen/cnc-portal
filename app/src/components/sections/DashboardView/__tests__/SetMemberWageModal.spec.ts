import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent } from 'vue'
import SetMemberWageModal from '../SetMemberWageModal.vue'
import { useSetMemberWageMutation } from '@/queries/wage.queries'
import { createMockMutationResponse } from '@/tests/mocks'

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

  const vmAsAny = (wrapper: ReturnType<typeof createWrapper>) =>
    wrapper.vm as unknown as {
      wageData: {
        id: number
        teamId: number
        userAddress: string
        enableOvertimeRules: boolean
        maximumHoursPerWeek: number
        ratePerHour: Array<{ type: string; amount: number; enabled?: boolean }>
        overtimeRatePerHour: Array<{ type: string; amount: number; enabled?: boolean }>
      }
    }

  it('returns to standard step when Back is clicked on the overtime step', async () => {
    const wrapper = createWrapper()
    await openModal(wrapper)
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

    vmAsAny(wrapper).wageData.enableOvertimeRules = true
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="overtime-step"]').exists()).toBe(true)

    await wrapper.find('[data-test="close-wage-modal-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    await openModal(wrapper)

    expect(wrapper.find('[data-test="standard-step"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="overtime-step"]').exists()).toBe(false)
  })

  it('resets form data via reset event from standard step', async () => {
    const wrapper = createWrapper()
    await openModal(wrapper)

    vmAsAny(wrapper).wageData.maximumHoursPerWeek = 99
    await wrapper.vm.$nextTick()

    await wrapper.findComponent(StandardStepStub).vm.$emit('reset')
    await wrapper.vm.$nextTick()

    expect(vmAsAny(wrapper).wageData.maximumHoursPerWeek).toBe(mockWage.maximumHoursPerWeek)
  })

  it('calls mutation with overtime payload when overtime step is submitted', async () => {
    const wrapper = createWrapper()
    await openModal(wrapper)

    const vm = wrapper.vm as any
    vm.wageData.enableOvertimeRules = true
    vm.wageData.overtimeRatePerHour[1].enabled = true // usdc
    vm.wageData.overtimeRatePerHour[1].amount = 20
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="save-overtime-wage-button"]').trigger('click')

    expect(mutateSpy).toHaveBeenCalledOnce()
    expect(mutateSpy.mock.calls[0]?.[0].body).toMatchObject({
      teamId: mockTeamId,
      userAddress: mockMember.address,
      overtimeRatePerHour: [{ type: 'usdc', amount: 20 }]
    })
  })

  it('shows a success toast and closes the modal after mutation succeeds', async () => {
    mutateSpy.mockImplementation((_payload: unknown, options: { onSuccess?: () => void }) => {
      options?.onSuccess?.()
    })

    const wrapper = createWrapper()
    await openModal(wrapper)
    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()

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

  it('sets default user address to empty string when member has no address', async () => {
    const wrapper = createWrapper({ member: { name: 'No Address' } })
    await openModal(wrapper)

    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    expect(mutateSpy.mock.calls[0]?.[0].body.userAddress).toBe('')
  })
})

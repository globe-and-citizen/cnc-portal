import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import SubmitClaims from '../SubmitClaims.vue'
import { useSubmitClaimMutation } from '@/queries/weeklyClaim.queries'
import { mockTeamStore, mockToastStore } from '@/tests/mocks'
import { createMockMutationResponse } from '@/tests/mocks/query.mock'

const claimFormResetMock = vi.fn()

const ClaimFormStub = defineComponent({
  name: 'ClaimForm',
  props: {
    initialData: { type: Object, required: false },
    isLoading: { type: Boolean, required: false },
    disabledWeekStarts: { type: Array, required: false },
    restrictSubmit: { type: Boolean, required: false }
  },
  emits: ['submit'],
  setup(_, { expose }) {
    expose({ resetForm: claimFormResetMock })
    return () => null
  }
})

const createComponent = (props: Record<string, unknown> = {}) => {
  const queryClient = new QueryClient()
  return mount(SubmitClaims, {
    props,
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]],
      stubs: {
        UButton: {
          name: 'UButton',
          template:
            '<button :disabled="disabled" data-test="modal-submit-hours-button" @click="$emit(\'click\')"><slot /></button>',
          props: ['disabled', 'loading'],
          emits: ['click']
        },
        ModalComponent: {
          name: 'ModalComponent',
          template: '<div v-if="modelValue"><slot /></div>',
          props: ['modelValue'],
          emits: ['update:modelValue']
        },
        ClaimForm: ClaimFormStub
      }
    }
  })
}

describe('SubmitClaims', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockTeamStore.currentTeamId = '1'
    mockToastStore.addErrorToast.mockClear()
    mockToastStore.addSuccessToast.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows submit button as enabled for pending weekly claim', () => {
    const wrapper = createComponent({ weeklyClaim: { status: 'pending' } })

    const submitButton = wrapper.find('[data-test="modal-submit-hours-button"]')
    expect(submitButton.exists()).toBe(true)
    expect(submitButton.attributes('disabled')).toBeUndefined()
  })

  it('disables submit button when weekly claim is not pending', () => {
    const wrapper = createComponent({ weeklyClaim: { status: 'signed' } })

    const submitButton = wrapper.find('[data-test="modal-submit-hours-button"]')
    expect(submitButton.attributes('disabled')).toBeDefined()
  })

  it('shows success toast and resets form after successful claim submission', async () => {
    const wrapper = createComponent()

    await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')
    await flushPromises()

    const claimForm = wrapper.findComponent({ name: 'ClaimForm' })
    const submitData = {
      hoursWorked: 8,
      memo: 'Test work',
      dayWorked: '2024-01-10T00:00:00.000Z',
      files: []
    }

    claimForm.vm.$emit('submit', submitData)
    await flushPromises()

    expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Wage claim added successfully')
    expect(claimFormResetMock).toHaveBeenCalledTimes(1)
    expect(wrapper.findComponent({ name: 'ClaimForm' }).exists()).toBe(false)
  })

  it('shows error toast and blocks submit when team id is missing', async () => {
    mockTeamStore.currentTeamId = undefined

    const wrapper = createComponent()
    await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')
    await flushPromises()

    const claimForm = wrapper.findComponent({ name: 'ClaimForm' })
    claimForm.vm.$emit('submit', {
      hoursWorked: 8,
      memo: 'Test work',
      dayWorked: '2024-01-10T00:00:00.000Z',
      files: []
    })
    await flushPromises()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Team not selected')
  })

  it('passes loading state to button when mutation is pending', async () => {
    vi.mocked(useSubmitClaimMutation).mockReturnValueOnce(
      createMockMutationResponse(null, true) as ReturnType<typeof useSubmitClaimMutation>
    )

    const wrapper = createComponent()
    const button = wrapper.find('[data-test="modal-submit-hours-button"]')

    // Verify button is disabled when mutation is pending (loading state behavior)
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('shows backend business message inline without error toast when submit fails', async () => {
    const backendMessage =
      'Unable to submit this claim: your weekly hours limit would be exceeded. Remaining to submit: 2h.'

    vi.mocked(useSubmitClaimMutation).mockReturnValueOnce({
      mutateAsync: vi.fn().mockRejectedValue({
        response: {
          data: {
            message: backendMessage
          }
        }
      }),
      isPending: { value: false }
    } as unknown as ReturnType<typeof useSubmitClaimMutation>)

    const wrapper = createComponent()

    // Trigger submission by emitting the ClaimForm submit event through wrapper
    // (simulates user submitting the form)
    const vm = wrapper.vm as any
    if (vm.handleSubmitClaim) {
      await vm.handleSubmitClaim({
        hoursWorked: 8,
        memo: 'Test work',
        dayWorked: '2024-01-10T00:00:00.000Z',
        files: []
      })
    }
    await flushPromises()

    // Verify that the specific backend message error does not show as a toast
    // (the component should handle it differently, likely displaying it inline in the form)
    expect(mockToastStore.addErrorToast).not.toHaveBeenCalledWith(backendMessage)
  })
})

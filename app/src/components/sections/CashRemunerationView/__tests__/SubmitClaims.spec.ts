import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import SubmitClaims from '../SubmitClaims.vue'
import { useSubmitClaimMutation } from '@/queries/weeklyClaim.queries'
import { mockTeamStore, mockToastStore } from '@/tests/mocks'

const submitMutationMock = vi.fn()
const isPendingRef = ref(false)
const claimFormResetMock = vi.fn()

vi.mock('@/composables/useSubmitRestriction', () => ({
  useSubmitRestriction: vi.fn(() => ({
    isRestricted: false,
    checkRestriction: vi.fn().mockResolvedValue(undefined)
  }))
}))

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
        ButtonUI: {
          name: 'ButtonUI',
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
    submitMutationMock.mockReset()
    submitMutationMock.mockResolvedValue(undefined)
    isPendingRef.value = false
    claimFormResetMock.mockReset()

    mockTeamStore.currentTeamId = '1'
    mockToastStore.addErrorToast.mockClear()
    mockToastStore.addSuccessToast.mockClear()

    vi.mocked(useSubmitClaimMutation).mockReturnValue({
      mutateAsync: submitMutationMock,
      isPending: isPendingRef
    } as unknown as ReturnType<typeof useSubmitClaimMutation>)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render submit button enabled when weekly claim is pending', () => {
    const wrapper = createComponent({ weeklyClaim: { status: 'pending' } })

    const submitButton = wrapper.find('[data-test="modal-submit-hours-button"]')
    expect(submitButton.exists()).toBe(true)
    expect(submitButton.attributes('disabled')).toBeUndefined()
  })

  it('should disable submit button when weekly claim is not pending', () => {
    const wrapper = createComponent({ weeklyClaim: { status: 'signed' } })

    const submitButton = wrapper.find('[data-test="modal-submit-hours-button"]')
    expect(submitButton.attributes('disabled')).toBeDefined()
  })

  it('should submit claim with current team id and close modal on success', async () => {
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

    expect(submitMutationMock).toHaveBeenCalledWith({
      ...submitData,
      teamId: '1'
    })
    expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Wage claim added successfully')
    expect(claimFormResetMock).toHaveBeenCalledTimes(1)
    expect(wrapper.findComponent({ name: 'ClaimForm' }).exists()).toBe(false)
  })

  it('should show team error and block submit when team id is missing', async () => {
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

    expect(submitMutationMock).not.toHaveBeenCalled()
    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Team not selected')
  })

  it('should surface API error and reset when modal closes', async () => {
    submitMutationMock.mockRejectedValueOnce({
      response: {
        data: { message: 'Backend down' }
      }
    })

    const wrapper = createComponent()
    await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')
    await flushPromises()

    const claimForm = wrapper.findComponent({ name: 'ClaimForm' })
    claimForm.vm.$emit('submit', {
      hoursWorked: 4,
      memo: 'Failing submit',
      dayWorked: '2024-01-12T00:00:00.000Z',
      files: []
    })
    await flushPromises()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Backend down')
    expect(wrapper.text()).toContain('Backend down')

    const modal = wrapper.findComponent({ name: 'ModalComponent' })
    modal.vm.$emit('update:modelValue', false)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Backend down')

    await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Backend down')
  })

  it('should pass loading state to button and form', async () => {
    isPendingRef.value = true

    const wrapper = createComponent()
    const button = wrapper.findComponent({ name: 'ButtonUI' })

    expect(button.props('loading')).toBe(true)

    await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')
    await flushPromises()

    const claimForm = wrapper.findComponent({ name: 'ClaimForm' })
    expect(claimForm.props('isLoading')).toBe(true)
  })
})

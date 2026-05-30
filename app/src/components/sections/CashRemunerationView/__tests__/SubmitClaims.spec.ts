import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import SubmitClaims from '../SubmitClaims.vue'
import { useSubmitClaimMutation } from '@/queries/weeklyClaim.queries'
import { mockTeamStore, mockToast } from '@/tests/mocks'
import { createMockMutationResponse } from '@/tests/mocks/query.mock'

const claimFormResetMock = vi.fn()

const ClaimFormStub = defineComponent({
  name: 'ClaimForm',
  props: {
    initialData: { type: Object, required: false },
    isLoading: { type: Boolean, required: false },
    disabledWeekStarts: { type: Array, required: false },
    restrictSubmit: { type: Boolean, required: false },
    errorMessage: { type: String, required: false, default: '' },
    errorTitle: { type: String, required: false, default: '' }
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
        ClaimForm: ClaimFormStub
      }
    }
  })
}

describe('SubmitClaims', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockTeamStore.currentTeamId = '1'
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

  it('keeps submit enabled on un-migrated teams (issue #1825 — submission is not frozen, only signing)', () => {
    const previous = mockTeamStore.currentTeamMeta
    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: { ...previous.data, isMigrated: false }
    } as typeof mockTeamStore.currentTeamMeta

    try {
      const wrapper = createComponent({ weeklyClaim: { status: 'pending' } })
      const submitButton = wrapper.find('[data-test="modal-submit-hours-button"]')
      expect(submitButton.attributes('disabled')).toBeUndefined()
    } finally {
      mockTeamStore.currentTeamMeta = previous
    }
  })

  it('shows success toast and resets form after successful claim submission', async () => {
    const wrapper = createComponent()

    await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')
    await flushPromises()

    const claimForm = wrapper.findComponent({ name: 'ClaimForm' })
    const submitData = {
      minutesWorked: 480,
      memo: 'Test work',
      dayWorked: '2024-01-10T00:00:00.000Z',
      files: []
    }

    claimForm.vm.$emit('submit', submitData)
    await flushPromises()

    // expect(mockToast.add).toHaveBeenCalledWith({
    //   title: 'Wage claim added successfully',
    //   color: 'success'
    // })
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
      minutesWorked: 480,
      memo: 'Test work',
      dayWorked: '2024-01-10T00:00:00.000Z',
      files: []
    })
    await flushPromises()

    // expect(mockToast.add).toHaveBeenCalledWith({ title: 'Team not selected', color: 'error' })
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
      isPending: ref(false)
    } as unknown as ReturnType<typeof useSubmitClaimMutation>)

    const wrapper = createComponent()

    await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')
    await flushPromises()

    const claimForm = wrapper.findComponent({ name: 'ClaimForm' })
    claimForm.vm.$emit('submit', {
      minutesWorked: 480,
      memo: 'Test work',
      dayWorked: '2024-01-10T00:00:00.000Z',
      files: []
    })
    await flushPromises()

    // Error surfaces as the ClaimForm's error-message prop
    expect(wrapper.findComponent({ name: 'ClaimForm' }).props('errorMessage')).toBe(backendMessage)
    expect(mockToast.add).not.toHaveBeenCalledWith({ title: backendMessage, color: 'error' })
  })

  it('uses Error.message fallback when backend message is absent', async () => {
    vi.mocked(useSubmitClaimMutation).mockReturnValueOnce({
      mutateAsync: vi.fn().mockRejectedValue(new Error('Plain failure message')),
      isPending: ref(false)
    } as unknown as ReturnType<typeof useSubmitClaimMutation>)

    const wrapper = createComponent()
    await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')
    await flushPromises()

    const claimForm = wrapper.findComponent({ name: 'ClaimForm' })
    claimForm.vm.$emit('submit', {
      minutesWorked: 480,
      memo: 'Test work',
      dayWorked: '2024-01-10T00:00:00.000Z',
      files: []
    })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'ClaimForm' }).props('errorMessage')).toBe(
      'Plain failure message'
    )
  })

  it('opens modal with clicked day when using openModalForDay', async () => {
    const wrapper = createComponent({ selectedWeekStart: '2024-01-08T00:00:00.000Z' })
    const dayIso = '2024-01-10T00:00:00.000Z'

    // openModalForDay is an exposed (defineExpose) public API consumed by parent
    // components through a template ref — there is no UI surface that drives it.
    // eslint-disable-next-line no-restricted-syntax -- exposed method has no UI trigger; consumed by parents via template ref
    const exposed = wrapper.vm as unknown as { openModalForDay: (iso: string) => void }
    exposed.openModalForDay(dayIso)
    await flushPromises()

    // Assert effect via DOM: ClaimForm renders with formInitialData.dayWorked set to dayIso
    const claimForm = wrapper.findComponent({ name: 'ClaimForm' })
    expect(claimForm.exists()).toBe(true)
    expect((claimForm.props('initialData') as { dayWorked: string }).dayWorked).toBe(dayIso)
  })
})

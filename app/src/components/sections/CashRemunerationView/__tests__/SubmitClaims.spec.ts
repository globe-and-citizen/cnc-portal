import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SubmitClaims from '../SubmitClaims.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref, nextTick } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

// Mock refs for reactive states
const mockPostStatus = ref<number | null>(null)
const mockPostError = ref<unknown>(null)
const mockPostIsFetching = ref(false)
const mockPostData = ref(null)
const mockPostResponse = ref<{ json: () => Promise<{ message: string }> } | null>(null)

let resolveExecute: (val: unknown) => void = () => {}

const executePostMock = vi.fn(async () => {
  mockPostIsFetching.value = true
  return new Promise((resolve) => {
    resolveExecute = resolve
  }).finally(() => {
    mockPostIsFetching.value = false
  })
})

// Toast mocks
const successToastMock = vi.fn()
const errorToastMock = vi.fn()

// Hoist and structure mocks
const mocks = vi.hoisted(() => ({
  mockUseCustomFetch: vi.fn(),
  mockUseTeamStore: vi.fn(() => ({
    currentTeam: { id: 1 } as { id: number } | null // Default mock with correct type
  })),
  mockUseToastStore: vi.fn(() => ({
    addErrorToast: errorToastMock,
    addSuccessToast: successToastMock
  }))
}))

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useTeamStore: mocks.mockUseTeamStore,
    useToastStore: mocks.mockUseToastStore
  }
})

vi.mock('@/composables/useCustomFetch', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useCustomFetch: mocks.mockUseCustomFetch
  }
})

afterEach(() => {
  vi.clearAllMocks()
  mockPostStatus.value = null
  mockPostError.value = null
  mockPostData.value = null
  mockPostResponse.value = null
})

describe('SubmitClaims', () => {
  beforeEach(() => {
    mocks.mockUseCustomFetch.mockReturnValueOnce({
      post: vi.fn().mockImplementation(() => ({
        json: vi.fn().mockReturnValue({
          data: mockPostData,
          error: mockPostError,
          statusCode: mockPostStatus,
          isFetching: mockPostIsFetching,
          execute: executePostMock,
          response: mockPostResponse
        })
      }))
    })
  })

  const createComponent = () => {
    const queryClient = new QueryClient()
    return mount(SubmitClaims, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]]
      }
    })
  }

  it('should render correctly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })

  it('should show success toast on successful claim submission', async () => {
    const wrapper = createComponent()

    // Open modal
    await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')

    // Add input
    await wrapper.find('input[data-test="hours-worked-input"]').setValue('10')
    await wrapper.find('textarea[data-test="memo-input"]').setValue('Worked on feature X')

    // Submit
    await wrapper.find('[data-test="submit-claim-button"]').trigger('click')

    expect(executePostMock).toHaveBeenCalledTimes(1)

    // Mock the post status to simulate a successful submission
    mockPostStatus.value = 201

    // Resolve the promise to simulate the completion of the request
    resolveExecute({})
    await flushPromises()

    expect(executePostMock).toHaveBeenCalled()

    expect(successToastMock).toHaveBeenCalled()
  })

  it('should display error message on failed claim submission', async () => {
    const wrapper = createComponent()

    // Open modal
    await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')

    // Add input
    await wrapper.find('input[data-test="hours-worked-input"]').setValue('10')
    await wrapper.find('textarea[data-test="memo-input"]').setValue('Worked on feature X')

    // Submit
    await wrapper.find('[data-test="submit-claim-button"]').trigger('click')

    expect(executePostMock).toHaveBeenCalledTimes(1)

    // Mock the post status to simulate a failed submission
    mockPostStatus.value = 400
    mockPostError.value = new Error('Error')
    mockPostResponse.value = {
      json: vi.fn().mockResolvedValue({ message: 'Failed to add claim' })
    }

    // Resolve the promise to simulate the completion of the request
    resolveExecute(null)
    await flushPromises()

    expect(successToastMock).not.toHaveBeenCalled()
    expect(errorToastMock).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').text()).toContain('Failed to add claim')
  })

  describe('Date Handling', () => {
    it.skip('should format UTC date correctly from Date object', async () => {
      const wrapper = createComponent()

      // Open modal
      await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')

      // Set a specific date value
      const testDate = new Date('2024-01-01T00:00:00.000Z')
      await wrapper.vm.handleSubmit({
        hoursWorked: 8,
        memo: 'Test work',
        dayWorked: testDate.toISOString()
      })

      expect(executePostMock).toHaveBeenCalledWith(
        expect.objectContaining({
          dayWorked: '2024-01-01T00:00:00.000Z'
        })
      )
    })

    it.skip('should format UTC date correctly from string', async () => {
      const wrapper = createComponent()

      await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')
      await nextTick()

      const formData = {
        hoursWorked: 8,
        memo: 'Test work',
        dayWorked: '2024-01-01T00:00:00.000Z'
      }

      await wrapper.vm.handleSubmit(formData)
      await flushPromises()

      expect(executePostMock).toHaveBeenCalledWith(
        expect.objectContaining({
          dayWorked: '2024-01-01T00:00:00.000Z'
        })
      )

      // Complete the request
      mockPostStatus.value = 201
      resolveExecute({})
      await flushPromises()
    })
  })

  describe('Form Validation', () => {
    it('should validate form before submission', async () => {
      const wrapper = createComponent()
      await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')

      const form = wrapper.findComponent({ name: 'ClaimForm' })
      await form.vm.$emit('submit', {
        hoursWorked: 8,
        memo: 'Test work',
        dayWorked: '2024-01-01T00:00:00.000Z'
      })

      expect(executePostMock).toHaveBeenCalled()
    })

    it('should handle form reset', async () => {
      const wrapper = createComponent()

      // Open modal and fill form
      await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')

      const form = wrapper.findComponent({ name: 'ClaimForm' })
      await form.vm.$emit('submit', {
        hoursWorked: 8,
        memo: 'Test work',
        dayWorked: '2024-01-01T00:00:00.000Z'
      })

      // Simulate successful submission
      mockPostStatus.value = 201
      resolveExecute({})
      await flushPromises()

      // Check if form is reset
      expect(wrapper.vm.formInitialData).toEqual(
        expect.objectContaining({
          hoursWorked: '',
          memo: ''
        })
      )
    })
  })

  describe('Modal Handling', () => {
    it('should open modal with default form data', async () => {
      const wrapper = createComponent()

      await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')

      expect(wrapper.vm.modal).toBe(true)
      expect(wrapper.vm.formInitialData).toEqual(
        expect.objectContaining({
          hoursWorked: '',
          memo: ''
        })
      )
    })

    it('should clear error message when opening modal', async () => {
      const wrapper = createComponent()

      // Set an error message
      wrapper.vm.errorMessage = { message: 'Previous error' }

      // Open modal
      await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')

      expect(wrapper.vm.errorMessage).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it.skip('should handle missing claim payload', async () => {
      const wrapper = createComponent()

      await wrapper.find('[data-test="modal-submit-hours-button"]').trigger('click')
      await nextTick()

      const formData = {
        hoursWorked: 8,
        memo: 'Test work',
        dayWorked: '2024-01-01T00:00:00.000Z'
      }

      await wrapper.vm.handleSubmit(formData)
      await flushPromises()

      expect(executePostMock).toHaveBeenCalled()

      // Simulate error response
      mockPostStatus.value = 400
      mockPostError.value = new Error('Missing claim payload')
      mockPostResponse.value = {
        json: vi.fn().mockResolvedValue({ message: 'Missing claim payload' })
      }

      resolveExecute(null)
      await flushPromises()

      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
      expect(wrapper.find('[role="alert"]').text()).toContain('Missing claim payload')
    }, 10000) // Increase timeout if needed
  })
})

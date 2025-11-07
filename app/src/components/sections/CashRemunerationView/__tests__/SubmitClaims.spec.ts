import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SubmitClaims from '../SubmitClaims.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
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
    currentTeam: {
      id: 1
    }
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
})

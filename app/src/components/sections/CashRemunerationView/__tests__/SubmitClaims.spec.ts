import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SubmitClaims from '../SubmitClaims.vue'
import { createTestingPinia } from '@pinia/testing'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

// Toast mocks
const successToastMock = vi.fn()
const errorToastMock = vi.fn()

// Hoist and structure mocks
const mocks = vi.hoisted(() => ({
  mockApiClient: {
    post: vi.fn()
  },
  mockUseTeamStore: vi.fn(() => ({
    currentTeamId: 1 as number | undefined
  })),
  mockUseToastStore: vi.fn(() => ({
    addErrorToast: errorToastMock,
    addSuccessToast: successToastMock
  })),
  mockUseSubmitRestriction: vi.fn(() => ({
    isRestricted: false,
    checkRestriction: vi.fn()
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

vi.mock('@/composables/useSubmitRestriction', () => ({
  useSubmitRestriction: mocks.mockUseSubmitRestriction
}))

vi.mock('@/lib/axios', () => ({
  default: mocks.mockApiClient
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('SubmitClaims', () => {
  beforeEach(() => {
    // Setup axios mock to resolve successfully
    mocks.mockApiClient.post.mockResolvedValue({
      data: { message: 'Wage claim added successfully' }
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

  describe('Form Submission', () => {
    it('should include uploaded files in FormData', async () => {
      const wrapper = createComponent()

      const file = new File(['content'], 'test.png', { type: 'image/png' })
      const submitData = {
        hoursWorked: 8,
        memo: 'Test work',
        dayWorked: '2024-01-10T00:00:00.000Z',
        files: [file]
      }

      const claimForm = wrapper.findComponent({ name: 'ClaimForm' })
      claimForm.vm.$emit('submit', submitData)
      await flushPromises()

      expect(mocks.mockApiClient.post).toHaveBeenCalled()
      const callArgs = mocks.mockApiClient.post.mock.calls[0]!
      const formData = callArgs[1] as FormData

      expect(formData.getAll('files')).toHaveLength(1)
      expect(formData.getAll('files')[0]).toBe(file)
    })
  })

  describe('Error Handling', () => {
    it('should use default error message when API does not provide one', async () => {
      mocks.mockApiClient.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {}
        }
      })

      const wrapper = createComponent()

      const submitData = {
        hoursWorked: 8,
        memo: 'Test work',
        dayWorked: '2024-01-10T00:00:00.000Z',
        uploadedFiles: []
      }

      const claimForm = wrapper.findComponent({ name: 'ClaimForm' })
      claimForm.vm.$emit('submit', submitData)
      await flushPromises()

      expect(errorToastMock).toHaveBeenCalledWith('Failed to add claim')
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing team ID gracefully', async () => {
      mocks.mockUseTeamStore.mockReturnValueOnce({
        currentTeamId: undefined
      })

      const wrapper = createComponent()

      const submitData = {
        hoursWorked: 8,
        memo: 'Test work',
        dayWorked: '2024-01-10T00:00:00.000Z',
        uploadedFiles: []
      }

      const claimForm = wrapper.findComponent({ name: 'ClaimForm' })
      claimForm.vm.$emit('submit', submitData)
      await flushPromises()

      // Should not attempt to submit, instead show error
      expect(mocks.mockApiClient.post).not.toHaveBeenCalled()
      expect(errorToastMock).toHaveBeenCalledWith('Team not selected')
    })
  })
})

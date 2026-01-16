import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SubmitClaims from '../SubmitClaims.vue'
const MOCK_IMAGE_URL = 'https://storage.railway.app/bucket/path/image.png'
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
    // Setup axios mock to handle upload and claim endpoints
    mocks.mockApiClient.post.mockImplementation((url: string) => {
      if (url === '/upload' || url.endsWith('/upload')) {
        return Promise.resolve({
          data: {
            fileKey: 'bucket/path/image.png',
            fileUrl: MOCK_IMAGE_URL,
            metadata: { fileType: 'image/png', fileSize: 123 }
          }
        })
      }

      if (url === '/claim' || url.endsWith('/claim')) {
        return Promise.resolve({ data: { message: 'Wage claim added successfully' } })
      }

      return Promise.resolve({ data: {} })
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
    it('should pre-upload files and submit attachments metadata', async () => {
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

      // First call should be upload, second call should be claim submission
      expect(mocks.mockApiClient.post).toHaveBeenCalledTimes(2)

      const uploadCall = mocks.mockApiClient.post.mock.calls[0]!
      expect(uploadCall[0]).toBe('/upload')
      const uploadForm = uploadCall[1] as FormData
      expect(uploadForm.get('file')).toBeTruthy()

      const claimCall = mocks.mockApiClient.post.mock.calls[1]!
      expect(claimCall[0]).toBe('/claim')
      const payload = claimCall[1]
      expect(payload).toBeDefined()
      expect(payload).toMatchObject({
        teamId: '1',
        hoursWorked: '8',
        memo: 'Test work',
        dayWorked: '2024-01-10T00:00:00.000Z'
      })
      expect(Array.isArray(payload.attachments)).toBe(true)
      expect(payload.attachments).toHaveLength(1)
      expect(payload.attachments[0]).toMatchObject({
        fileKey: 'bucket/path/image.png',
        fileUrl: MOCK_IMAGE_URL
      })
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

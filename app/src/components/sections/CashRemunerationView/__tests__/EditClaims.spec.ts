import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import EditClaims from '@/components/sections/CashRemunerationView/EditClaims.vue'
import type { Claim } from '@/types'
import type { Address } from 'viem'

// Test constants
const SELECTORS = {
  submitButton: '[data-test="claim-form-submit"]',
  cancelButton: '[data-test="claim-form-cancel"]',
  errorAlert: '[data-test="edit-claim-error"]'
} as const

const SUBMIT_PAYLOAD = {
  hoursWorked: 6,
  memo: 'Updated memo',
  dayWorked: '2024-02-01T00:00:00.000Z',
  uploadedFiles: []
}

const defaultClaim: Claim = {
  id: 1,
  hoursWorked: 4,
  dayWorked: '2024-01-01T00:00:00.000Z',
  memo: 'Initial memo',
  wageId: 2,
  fileAttachments: [],
  wage: {
    id: 5,
    teamId: 10,
    userAddress: '0x1234567890123456789012345678901234567890' as Address,
    ratePerHour: [{ type: 'native', amount: 1 }],
    cashRatePerHour: 0,
    tokenRatePerHour: 0,
    usdcRatePerHour: 0,
    maximumHoursPerWeek: 40,
    nextWageId: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
}

// Toast mocks
const successToastMock = vi.fn()
const errorToastMock = vi.fn()

// Hoisted mocks
const { mockApiClient, mockUseToastStore, mockTeamStore, mockCheckRestriction } = vi.hoisted(() => {
  const mockTeamStore = {
    currentTeamId: 1 as number | undefined,
    currentTeam: { id: 1 } as { id: number } | undefined
  }

  return {
    mockApiClient: {
      put: vi.fn(),
      post: vi.fn()
    },
    mockUseToastStore: vi.fn(() => ({
      addErrorToast: errorToastMock,
      addSuccessToast: successToastMock
    })),
    mockTeamStore,
    mockCheckRestriction: vi.fn()
  }
})

// Mock implementations
vi.mock('@/stores', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores')>()
  return {
    ...actual,
    useToastStore: mockUseToastStore,
    useTeamStore: () => mockTeamStore
  }
})

vi.mock('@/lib/axios', () => ({
  default: mockApiClient
}))

vi.mock('@/composables', () => ({
  useSubmitRestriction: () => ({
    isRestricted: ref(false),
    checkRestriction: mockCheckRestriction
  })
}))

// Helper function for creating wrapper
const createWrapper = (props: Partial<{ claim: Claim }> = {}) => {
  const queryClient = new QueryClient()
  return mount(EditClaims, {
    props: {
      claim: props.claim ?? defaultClaim
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]]
    }
  })
}

describe('EditClaims', () => {
  beforeEach(() => {
    // Reset team store values
    mockTeamStore.currentTeamId = 1
    mockTeamStore.currentTeam = { id: 1 }

    // Setup axios mock to resolve for put and handle upload posts
    mockApiClient.put.mockResolvedValue({ data: { message: 'Claim updated successfully' } })
    mockApiClient.post.mockImplementation((url: string) => {
      if (url === '/upload' || url.endsWith('/upload')) {
        return Promise.resolve({
          data: {
            fileKey: 'bucket/path/image.png',
            fileUrl: 'https://storage.railway.app/bucket/path/image.png',
            metadata: { fileType: 'image/png', fileSize: 123 }
          }
        })
      }
      return Promise.resolve({ data: {} })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('File Handling', () => {
    it('should pre-upload new files and submit attachments metadata', async () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' })
      const payloadWithFile = {
        ...SUBMIT_PAYLOAD,
        files: [file]
      }

      const wrapper = createWrapper()
      const form = wrapper.findComponent({ name: 'ClaimForm' })

      form.vm.$emit('submit', payloadWithFile)
      await flushPromises()

      // Upload should be called first, then put for claim update
      expect(mockApiClient.post).toHaveBeenCalled()
      const uploadCall = mockApiClient.post.mock.calls[0] as [string, FormData] | undefined
      expect(uploadCall).toBeDefined()
      expect(uploadCall![0]).toBe('/upload')
      const uploadForm = uploadCall![1] as FormData
      expect(uploadForm.get('file')).toBeTruthy()

      expect(mockApiClient.put).toHaveBeenCalled()
      const putCall = mockApiClient.put.mock.calls[0]
      expect(putCall![0]).toBe(`/claim/${defaultClaim.id}`)
      const payload = putCall![1]
      expect(payload).toBeDefined()
      expect(Array.isArray(payload.attachments)).toBe(true)
      expect(payload.attachments).toHaveLength(1)
      expect(payload.attachments[0]).toMatchObject({ fileKey: 'bucket/path/image.png' })
    })

    it('should include deletedFileIndexes in FormData when files are deleted', async () => {
      const claimWithFiles = {
        ...defaultClaim,
        fileAttachments: [
          {
            fileKey: 'bucket/path/file1.png',
            fileUrl: 'https://storage.railway.app/bucket/path/file1.png',
            fileType: 'image/png',
            fileSize: 1024
          },
          {
            fileKey: 'bucket/path/file2.png',
            fileUrl: 'https://storage.railway.app/bucket/path/file2.png',
            fileType: 'image/png',
            fileSize: 2048
          }
        ]
      }

      const wrapper = createWrapper({ claim: claimWithFiles })
      const form = wrapper.findComponent({ name: 'ClaimForm' })

      // Simulate file deletion via form event
      form.vm.$emit('delete-file', 0)
      await flushPromises()

      form.vm.$emit('submit', SUBMIT_PAYLOAD)
      await flushPromises()

      expect(mockApiClient.put).toHaveBeenCalled()
      const putCall = mockApiClient.put.mock.calls[0]
      expect(putCall).toBeDefined()
      const payload = putCall![1]
      expect(payload.deletedFileIndexes).toEqual([0])
    })
  })

  describe('Error Handling', () => {
    it('should use default error message when API does not provide one', async () => {
      mockApiClient.put.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {}
        }
      })

      const wrapper = createWrapper()
      const form = wrapper.findComponent({ name: 'ClaimForm' })

      form.vm.$emit('submit', SUBMIT_PAYLOAD)
      await flushPromises()

      expect(errorToastMock).toHaveBeenCalledWith('Failed to update claim')
      expect(wrapper.find(SELECTORS.errorAlert).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.errorAlert).text()).toContain('Failed to update claim')
    })

    it('should handle network errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockApiClient.put.mockRejectedValueOnce(new Error('Network failure'))

      const wrapper = createWrapper()
      const form = wrapper.findComponent({ name: 'ClaimForm' })

      form.vm.$emit('submit', SUBMIT_PAYLOAD)
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update claim:', expect.any(Error))
      expect(errorToastMock).toHaveBeenCalledWith('Network failure')
      expect(wrapper.emitted('close')).toBeUndefined()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Modal Interactions', () => {
    it('should emit close when cancel is triggered', async () => {
      const wrapper = createWrapper()
      const form = wrapper.findComponent({ name: 'ClaimForm' })

      form.vm.$emit('cancel')
      await flushPromises()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when update fails', async () => {
      mockApiClient.put.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'Failed to update claim' }
        }
      })

      const wrapper = createWrapper()
      const form = wrapper.findComponent({ name: 'ClaimForm' })

      form.vm.$emit('submit', SUBMIT_PAYLOAD)
      await flushPromises()

      expect(wrapper.emitted('close')).toBeUndefined()
    })
  })

  describe('Loading States', () => {
    it('should show loading state during update', async () => {
      let resolveUpdate: (value: { data: { message: string } }) => void
      const updatePromise = new Promise<{ data: { message: string } }>((resolve) => {
        resolveUpdate = resolve
      })

      mockApiClient.put.mockReturnValueOnce(updatePromise)

      const wrapper = createWrapper()
      const form = wrapper.findComponent({ name: 'ClaimForm' })

      form.vm.$emit('submit', SUBMIT_PAYLOAD)
      await flushPromises()

      expect(form.props('isLoading')).toBe(true)

      resolveUpdate!({ data: { message: 'Success' } })
      await flushPromises()

      expect(form.props('isLoading')).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle team without ID gracefully', async () => {
      mockTeamStore.currentTeamId = undefined
      mockTeamStore.currentTeam = undefined

      const wrapper = createWrapper()
      const form = wrapper.findComponent({ name: 'ClaimForm' })

      form.vm.$emit('submit', SUBMIT_PAYLOAD)
      await flushPromises()

      expect(mockApiClient.put).not.toHaveBeenCalled()
      expect(errorToastMock).toHaveBeenCalledWith('Team not selected')
    })
  })
})

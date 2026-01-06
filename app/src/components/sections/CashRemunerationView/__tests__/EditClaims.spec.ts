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
      put: vi.fn()
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

    // Setup axios mock to resolve successfully
    mockApiClient.put.mockResolvedValue({
      data: { message: 'Claim updated successfully' }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('File Handling', () => {
    it('should include uploaded files in FormData', async () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' })
      const payloadWithFile = {
        ...SUBMIT_PAYLOAD,
        files: [file]
      }

      const wrapper = createWrapper()
      const form = wrapper.findComponent({ name: 'ClaimForm' })

      form.vm.$emit('submit', payloadWithFile)
      await flushPromises()

      expect(mockApiClient.put).toHaveBeenCalled()
      const callArgs = mockApiClient.put.mock.calls[0]
      expect(callArgs).toBeDefined()
      const formData = callArgs![1] as FormData

      expect(formData.get('files')).toBeTruthy()
    })

    it('should include deletedFileIndexes in FormData when files are deleted', async () => {
      const claimWithFiles = {
        ...defaultClaim,
        fileAttachments: [
          { fileName: 'file1.png', fileType: 'image/png', fileSize: 1024, fileData: 'base64' },
          { fileName: 'file2.png', fileType: 'image/png', fileSize: 2048, fileData: 'base64' }
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
      const callArgs = mockApiClient.put.mock.calls[0]
      expect(callArgs).toBeDefined()
      const formData = callArgs![1] as FormData

      expect(formData.get('deletedFileIndexes')).toBe('[0]')
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

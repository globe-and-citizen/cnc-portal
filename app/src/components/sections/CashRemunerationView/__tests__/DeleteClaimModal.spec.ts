import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DeleteClaimModal from '@/components/sections/CashRemunerationView/DeleteClaimModal.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import type { Claim } from '@/types'
import dayjs from 'dayjs'

// Mock refs for reactive states
const mockDeleteStatus = ref<number | null>(null)
const mockDeleteError = ref<unknown>(null)
const mockDeleteIsFetching = ref(false)
const mockDeleteData = ref(null)
const mockDeleteResponse = ref<{ json: () => Promise<{ message: string }> } | null>(null)

let resolveExecute: (val: unknown) => void = () => {}

const executeDeleteMock = vi.fn(async () => {
  mockDeleteIsFetching.value = true
  return new Promise((resolve) => {
    resolveExecute = resolve
  }).finally(() => {
    mockDeleteIsFetching.value = false
  })
})

// Toast mocks
const successToastMock = vi.fn()
const errorToastMock = vi.fn()

// Test data
const defaultClaim: Claim = {
  id: 1,
  hoursWorked: 8,
  memo: 'Test work',
  dayWorked: dayjs().startOf('day').toISOString(),
  wageId: 1,
  wage: {
    id: 5,
    teamId: 10,
    userAddress: '0x1234567890123456789012345678901234567890',
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

// Hoist and structure mocks
const {
  mockUseCustomFetch,
  mockUseToastStore,
  mockUseTeamStore,
  mockUseQueryClient,
  mockQueryClient
} = vi.hoisted(() => {
  const mockQueryClient = {
    invalidateQueries: vi.fn()
  }

  return {
    mockUseCustomFetch: vi.fn(),
    mockUseToastStore: vi.fn(() => ({
      addErrorToast: errorToastMock,
      addSuccessToast: successToastMock
    })),
    mockUseTeamStore: vi.fn(() => ({
      currentTeamId: 1
    })),
    mockUseQueryClient: vi.fn(() => mockQueryClient),
    mockQueryClient
  }
})

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: mockUseToastStore,
    useTeamStore: mockUseTeamStore
  }
})

vi.mock('@/composables/useCustomFetch', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useCustomFetch: mockUseCustomFetch
  }
})

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: mockUseQueryClient
}))

describe('DeleteClaimModal', () => {
  beforeEach(() => {
    mockUseCustomFetch.mockReturnValueOnce({
      delete: vi.fn().mockImplementation(() => ({
        json: vi.fn().mockReturnValue({
          data: mockDeleteData,
          error: mockDeleteError,
          statusCode: mockDeleteStatus,
          isFetching: mockDeleteIsFetching,
          execute: executeDeleteMock,
          response: mockDeleteResponse
        })
      }))
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockDeleteStatus.value = null
    mockDeleteError.value = null
    mockDeleteData.value = null
    mockDeleteResponse.value = null
  })

  const createWrapper = (props = {}) => {
    return mount(DeleteClaimModal, {
      props: {
        claim: defaultClaim,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  describe('Component Rendering', () => {
    it('should render correctly', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBeTruthy()
    })

    it('should display claim details', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('8 h')
      expect(wrapper.text()).toContain(dayjs(defaultClaim.dayWorked).format('MMM DD, YYYY'))
    })

    it('should render action buttons', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('[data-test="confirm-delete-claim-button"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="cancel-delete-claim-button"]').exists()).toBe(true)
    })
  })

  describe('Delete Functionality', () => {
    it('should show success toast on successful claim deletion', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

      expect(executeDeleteMock).toHaveBeenCalledTimes(1)

      mockDeleteStatus.value = 200
      resolveExecute({})
      await flushPromises()

      expect(executeDeleteMock).toHaveBeenCalled()
      expect(successToastMock).toHaveBeenCalledWith('Claim deleted successfully')
    })

    it.skip('should invalidate weekly claims query after successful deletion', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

      mockDeleteStatus.value = 200
      resolveExecute({})
      await flushPromises()

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['weekly-claims', 1]
      })
    })

    it('should emit close event after successful deletion', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

      mockDeleteStatus.value = 200
      resolveExecute({})
      await flushPromises()

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Error Handling', () => {
    it('should display error message on failed claim deletion', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

      expect(executeDeleteMock).toHaveBeenCalledTimes(1)

      mockDeleteStatus.value = 400
      mockDeleteError.value = new Error('Error')
      mockDeleteResponse.value = {
        json: vi.fn().mockResolvedValue({ message: 'Failed to delete claim' })
      }

      resolveExecute(null)
      await flushPromises()

      expect(successToastMock).not.toHaveBeenCalled()
      expect(wrapper.find('[data-test="delete-claim-error"]').text()).toContain(
        'Failed to delete claim'
      )
    })

    it('should show error toast when deletion fails', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

      mockDeleteStatus.value = 400
      mockDeleteError.value = new Error('Network error')
      mockDeleteResponse.value = {
        json: vi.fn().mockResolvedValue({ message: 'Network error' })
      }

      resolveExecute(null)
      await flushPromises()

      expect(errorToastMock).toHaveBeenCalledWith('Network error')
    })

    it('should handle error parsing failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = createWrapper()

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

      mockDeleteError.value = new Error('Parse error')
      mockDeleteResponse.value = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      }

      resolveExecute(null)
      await flushPromises()

      expect(wrapper.find('[data-test="delete-claim-error"]').text()).toBe('Failed to delete claim')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse delete claim error response',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should use default error message when API does not provide one', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

      mockDeleteStatus.value = 500
      mockDeleteError.value = new Error('Server error')
      mockDeleteResponse.value = {
        json: vi.fn().mockResolvedValue({})
      }

      resolveExecute(null)
      await flushPromises()

      expect(wrapper.find('[data-test="delete-claim-error"]').text()).toBe('Failed to delete claim')
      expect(errorToastMock).toHaveBeenCalledWith('Failed to delete claim')
    })
  })

  describe('Modal Interactions', () => {
    it('should emit close when cancel button is clicked', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="cancel-delete-claim-button"]').trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when deletion fails', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

      mockDeleteStatus.value = 400
      mockDeleteError.value = new Error('Error')
      mockDeleteResponse.value = {
        json: vi.fn().mockResolvedValue({ message: 'Failed to delete claim' })
      }

      resolveExecute(null)
      await flushPromises()

      expect(wrapper.emitted('close')).toBeUndefined()
    })
  })

  describe('Loading States', () => {
    it('should show loading state during deletion', async () => {
      const wrapper = createWrapper()

      mockDeleteIsFetching.value = true
      await wrapper.vm.$nextTick()

      const deleteButton = wrapper.find('[data-test="confirm-delete-claim-button"]')
      const cancelButton = wrapper.find('[data-test="cancel-delete-claim-button"]')
      expect(deleteButton.classes()).toContain('btn-disabled')
      expect(cancelButton.classes()).toContain('btn-disabled')
    })

    it('should disable buttons during deletion', async () => {
      let resolveDelete: (value: unknown) => void
      const deletePromise = new Promise((resolve) => {
        resolveDelete = resolve
      })

      executeDeleteMock.mockReturnValue(deletePromise)

      const wrapper = createWrapper()

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

      mockDeleteIsFetching.value = true
      await wrapper.vm.$nextTick()

      const deleteButton = wrapper.find('[data-test="confirm-delete-claim-button"]')
      const cancelButton = wrapper.find('[data-test="cancel-delete-claim-button"]')

      expect(deleteButton.classes()).toContain('btn-disabled')
      expect(cancelButton.classes()).toContain('btn-disabled')

      mockDeleteIsFetching.value = false
      resolveDelete!({})
      await flushPromises()
    })
  })

  describe('Date Formatting', () => {
    it('should format date correctly', () => {
      const testDate = '2024-01-01T00:00:00.000Z'
      const wrapper = createWrapper({
        claim: { ...defaultClaim, dayWorked: testDate }
      })

      expect(wrapper.text()).toContain('Jan 01, 2024')
    })

    it('should handle different date formats', () => {
      const testDate = '2024-06-15T12:30:00.000Z'
      const wrapper = createWrapper({
        claim: { ...defaultClaim, dayWorked: testDate }
      })

      expect(wrapper.text()).toContain('Jun 15, 2024')
    })
  })

  // describe('Edge Cases', () => {
  //   it('should clear error message on new delete attempt', async () => {
  //     const wrapper = createWrapper()

  //     // First attempt - trigger error
  //     await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

  //     mockDeleteStatus.value = 400
  //     mockDeleteError.value = new Error('Error')
  //     mockDeleteResponse.value = {
  //       json: vi.fn().mockResolvedValue({ message: 'First error' })
  //     }

  //     resolveExecute(null)
  //     await flushPromises()

  //     expect(wrapper.find('[data-test="delete-claim-error"]').exists()).toBe(true)

  //     // Second attempt - should clear previous error
  //     executeDeleteMock.mockClear()
  //     mockDeleteError.value = null
  //     mockDeleteStatus.value = null

  //     mockUseCustomFetch.mockReturnValueOnce({
  //       delete: vi.fn().mockImplementation(() => ({
  //         json: vi.fn().mockReturnValue({
  //           data: mockDeleteData,
  //           error: mockDeleteError,
  //           statusCode: mockDeleteStatus,
  //           isFetching: mockDeleteIsFetching,
  //           execute: executeDeleteMock,
  //           response: mockDeleteResponse
  //         })
  //       }))
  //     })

  //     const newWrapper = createWrapper()
  //     await newWrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

  //     expect(newWrapper.find('[data-test="delete-claim-error"]').exists()).toBe(false)
  //   })
  // })
})

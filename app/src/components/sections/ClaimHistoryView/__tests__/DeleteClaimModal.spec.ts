import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DeleteClaimModal from '../DeleteClaimModal.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
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
const mocks = vi.hoisted(() => ({
  mockUseCustomFetch: vi.fn(),
  mockUseToastStore: vi.fn(() => ({
    addErrorToast: errorToastMock,
    addSuccessToast: successToastMock
  }))
}))

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
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

describe('DeleteClaimModal', () => {
  beforeEach(() => {
    mocks.mockUseCustomFetch.mockReturnValueOnce({
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
    const queryClient = new QueryClient()
    return mount(DeleteClaimModal, {
      props: {
        claim: defaultClaim,
        queryKey: ['weekly-claims', '1'],
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]]
      }
    })
  }

  it('should render correctly', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBeTruthy()
  })

  it('should show success toast on successful claim deletion', async () => {
    const wrapper = createWrapper()

    // Click delete button
    await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

    expect(executeDeleteMock).toHaveBeenCalledTimes(1)

    // Mock the delete status to simulate a successful deletion
    mockDeleteStatus.value = 200

    // Resolve the promise to simulate the completion of the request
    resolveExecute({})
    await flushPromises()

    expect(executeDeleteMock).toHaveBeenCalled()
    expect(successToastMock).toHaveBeenCalledWith('Claim deleted successfully')
  })

  it('should display error message on failed claim deletion', async () => {
    const wrapper = createWrapper()

    // Click delete button
    await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

    expect(executeDeleteMock).toHaveBeenCalledTimes(1)

    // Mock the delete status to simulate a failed deletion
    mockDeleteStatus.value = 400
    mockDeleteError.value = new Error('Error')
    mockDeleteResponse.value = {
      json: vi.fn().mockResolvedValue({ message: 'Failed to delete claim' })
    }

    // Resolve the promise to simulate the completion of the request
    resolveExecute(null)
    await flushPromises()

    expect(successToastMock).not.toHaveBeenCalled()
    expect(errorToastMock).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="delete-claim-error"]').text()).toContain(
      'Failed to delete claim'
    )
  })

  it('should close modal when cancel is clicked', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="cancel-delete-claim-button"]').trigger('click')

    expect(wrapper.emitted('update:show')).toBeTruthy()
    expect(wrapper.emitted('update:show')?.[0]).toEqual([false])
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('should format date correctly', () => {
    const testDate = '2024-01-01T00:00:00.000Z'
    const wrapper = createWrapper({
      claim: { ...defaultClaim, dayWorked: testDate }
    })

    expect(wrapper.text()).toContain('Jan 01, 2024')
  })

  describe('Error Handling', () => {
    it.skip('should handle console error and toast message', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = createWrapper()

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

      // Simulate error
      mockDeleteError.value = new Error('Network error')
      resolveExecute(null)
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to delete claim:', expect.any(Error))
      expect(errorToastMock).toHaveBeenCalledWith('Network error')

      consoleErrorSpy.mockRestore()
    })

    it('should handle error parsing failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = createWrapper()

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

      // Simulate error with invalid JSON response
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

    it('should handle case when claim is null', async () => {
      const wrapper = createWrapper({ claim: null })

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')

      expect(executeDeleteMock).not.toHaveBeenCalled()
    })

    it.skip('should invalidate queries when queryKey is valid', async () => {
      const queryClient = new QueryClient()
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = mount(DeleteClaimModal, {
        props: {
          claim: defaultClaim,
          queryKey: ['weekly-claims', '1']
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]]
        }
      })

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')
      mockDeleteStatus.value = 200
      resolveExecute({})
      await flushPromises()

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['weekly-claims', '1']
      })
    })

    it('should not invalidate queries when queryKey contains only undefined', async () => {
      const queryClient = new QueryClient()
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = mount(DeleteClaimModal, {
        props: {
          claim: defaultClaim,
          queryKey: [undefined, undefined]
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]]
        }
      })

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')
      mockDeleteStatus.value = 200
      resolveExecute({})
      await flushPromises()

      expect(invalidateQueriesSpy).not.toHaveBeenCalled()
    })
  })
})

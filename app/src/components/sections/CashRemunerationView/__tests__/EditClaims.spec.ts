import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import EditClaims from '@/components/sections/CashRemunerationView/EditClaims.vue'
import type { Claim } from '@/types'
import type { Address } from 'viem'
import { ref } from 'vue'

// Test constants
const SELECTORS = {
  submitButton: '[data-test="claim-form-submit"]',
  cancelButton: '[data-test="claim-form-cancel"]',
  errorAlert: '[data-test="edit-claim-error"]'
} as const

const SUBMIT_PAYLOAD = {
  hoursWorked: 6,
  memo: 'Updated memo',
  dayWorked: '2024-02-01T00:00:00.000Z'
}

const defaultClaim: Claim = {
  id: 1,
  hoursWorked: 4,
  dayWorked: '2024-01-01T00:00:00.000Z',
  memo: 'Initial memo',
  wageId: 2,
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

// Mock refs for reactive states
const mockUpdateStatus = ref<number | null>(null)
const mockUpdateError = ref<unknown>(null)
const mockUpdateIsFetching = ref(false)
const mockUpdateData = ref(null)
const mockUpdateResponse = ref<{ json: () => Promise<{ message: string }> } | null>(null)

let resolveExecute: (val: unknown) => void = () => {}

const executeUpdateMock = vi.fn(async () => {
  mockUpdateIsFetching.value = true
  return new Promise((resolve) => {
    resolveExecute = resolve
  }).finally(() => {
    mockUpdateIsFetching.value = false
  })
})

// Toast mocks
const successToastMock = vi.fn()
const errorToastMock = vi.fn()

// Hoisted mocks
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

// Mock component stubs
const ClaimFormStub = {
  name: 'ClaimForm',
  props: ['initialData', 'isEdit', 'isLoading'],
  emits: ['submit', 'cancel'],
  setup(
    _props: Record<string, unknown>,
    { emit }: { emit: (event: string, ...args: unknown[]) => void }
  ) {
    return {
      handleSubmit: () => emit('submit', SUBMIT_PAYLOAD),
      handleCancel: () => emit('cancel')
    }
  },
  template: `
    <div>
      <button data-test="claim-form-submit" @click="handleSubmit">submit</button>
      <button data-test="claim-form-cancel" @click="handleCancel">cancel</button>
    </div>
  `
}

// Mock implementations
vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: mockUseToastStore,
    useTeamStore: mockUseTeamStore
  }
})

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: mockUseQueryClient
}))

vi.mock('@/composables/useCustomFetch', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useCustomFetch: mockUseCustomFetch
  }
})

// Helper function for creating wrapper
const createWrapper = (props: Partial<{ claim: Claim }> = {}) =>
  mount(EditClaims, {
    props: {
      claim: props.claim ?? defaultClaim
    },
    global: {
      stubs: {
        ClaimForm: ClaimFormStub
      }
    }
  })

describe('EditClaims', () => {
  beforeEach(() => {
    mockUseCustomFetch.mockReturnValue({
      put: vi.fn().mockReturnValue({
        json: vi.fn().mockReturnValue({
          execute: executeUpdateMock,
          isFetching: mockUpdateIsFetching,
          error: mockUpdateError,
          statusCode: mockUpdateStatus,
          response: mockUpdateResponse,
          data: mockUpdateData
        })
      })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockUpdateStatus.value = null
    mockUpdateError.value = null
    mockUpdateData.value = null
    mockUpdateResponse.value = null
    mockUpdateIsFetching.value = false
  })

  describe('Component Rendering', () => {
    it('should render correctly', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBeTruthy()
    })

    it('should pass initial claim data to ClaimForm', () => {
      const wrapper = createWrapper({ claim: defaultClaim })
      const form = wrapper.findComponent(ClaimFormStub)

      expect(form.exists()).toBe(true)
      expect(form.props('initialData')).toEqual({
        hoursWorked: String(defaultClaim.hoursWorked),
        memo: defaultClaim.memo,
        dayWorked: defaultClaim.dayWorked
      })
      expect(form.props('isEdit')).toBe(true)
    })

    it('should render action buttons', () => {
      const wrapper = createWrapper()
      expect(wrapper.find(SELECTORS.submitButton).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.cancelButton).exists()).toBe(true)
    })
  })

  describe('Update Functionality', () => {
    it('should show success toast on successful claim update', async () => {
      const wrapper = createWrapper()

      await wrapper.find(SELECTORS.submitButton).trigger('click')

      expect(executeUpdateMock).toHaveBeenCalledTimes(1)

      mockUpdateStatus.value = 200
      resolveExecute({})
      await flushPromises()

      expect(executeUpdateMock).toHaveBeenCalled()
      expect(successToastMock).toHaveBeenCalledWith('Claim updated successfully')
    })

    it('should invalidate weekly claims query after successful update', async () => {
      const wrapper = createWrapper()

      await wrapper.find(SELECTORS.submitButton).trigger('click')

      mockUpdateStatus.value = 200
      resolveExecute({})
      await flushPromises()

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['weekly-claims', 1]
      })
    })

    it('should emit close event after successful update', async () => {
      const wrapper = createWrapper()

      await wrapper.find(SELECTORS.submitButton).trigger('click')

      mockUpdateStatus.value = 200
      resolveExecute({})
      await flushPromises()

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Error Handling', () => {
    it('should display error message on failed claim update', async () => {
      const wrapper = createWrapper()

      await wrapper.find(SELECTORS.submitButton).trigger('click')

      expect(executeUpdateMock).toHaveBeenCalledTimes(1)

      mockUpdateStatus.value = 400
      mockUpdateError.value = new Error('Error')
      mockUpdateResponse.value = {
        json: vi.fn().mockResolvedValue({ message: 'Failed to update claim' })
      }

      resolveExecute(null)
      await flushPromises()

      expect(successToastMock).not.toHaveBeenCalled()
      expect(wrapper.find(SELECTORS.errorAlert).text()).toContain('Failed to update claim')
    })

    it.skip('should use default error message when API does not provide one', async () => {
      const wrapper = createWrapper()

      await wrapper.find(SELECTORS.submitButton).trigger('click')

      mockUpdateStatus.value = 500
      mockUpdateError.value = new Error('Server error')
      mockUpdateResponse.value = {
        json: vi.fn().mockResolvedValue({})
      }

      resolveExecute(null)
      await flushPromises()

      expect(errorToastMock).toHaveBeenCalledWith('Failed to update claim')
    })
  })

  describe('Modal Interactions', () => {
    it('should emit close when cancel button is clicked', async () => {
      const wrapper = createWrapper()

      await wrapper.find(SELECTORS.cancelButton).trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not emit close when update fails', async () => {
      const wrapper = createWrapper()

      await wrapper.find(SELECTORS.submitButton).trigger('click')

      mockUpdateStatus.value = 400
      mockUpdateError.value = new Error('Error')
      mockUpdateResponse.value = {
        json: vi.fn().mockResolvedValue({ message: 'Failed to update claim' })
      }

      resolveExecute(null)
      await flushPromises()

      expect(wrapper.emitted('close')).toBeUndefined()
    })
  })

  describe('Loading States', () => {
    it('should pass loading state to ClaimForm', () => {
      mockUpdateIsFetching.value = true
      const wrapper = createWrapper()

      const form = wrapper.findComponent(ClaimFormStub)
      expect(form.props('isLoading')).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle team without ID gracefully', async () => {
      mockUseTeamStore.mockReturnValueOnce({
        currentTeam: null
      })

      const wrapper = createWrapper()

      await wrapper.find(SELECTORS.submitButton).trigger('click')

      mockUpdateStatus.value = 200
      resolveExecute({})
      await flushPromises()

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['weekly-claims', undefined]
      })
    })

    it('should handle update with error thrown in try-catch', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const errorMessage = 'Network failure'

      executeUpdateMock.mockRejectedValueOnce(new Error(errorMessage))

      const wrapper = createWrapper()

      await wrapper.find(SELECTORS.submitButton).trigger('click')
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update claim:', expect.any(Error))
      expect(errorToastMock).toHaveBeenCalledWith(errorMessage)
      expect(wrapper.emitted('close')).toBeUndefined()

      consoleErrorSpy.mockRestore()
    })
  })
})

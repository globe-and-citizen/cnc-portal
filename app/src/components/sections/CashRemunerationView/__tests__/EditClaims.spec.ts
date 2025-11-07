import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditClaimModal from '../EditClaims.vue'
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

// Hoisted mocks
const {
  mockUseCustomFetch,
  executeUpdateMock,
  mockToastStore,
  mockQueryClient,
  isFetchingValue,
  payloadFactoryRef
} = vi.hoisted(() => ({
  mockUseCustomFetch: vi.fn(),
  executeUpdateMock: vi.fn(),
  mockToastStore: {
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  },
  mockQueryClient: {
    invalidateQueries: vi.fn()
  },
  isFetchingValue: { value: false },
  payloadFactoryRef: { current: undefined as (() => unknown) | undefined }
}))

// Mock component stubs
const ClaimFormStub = {
  name: 'ClaimForm',
  props: ['initialData', 'isEdit', 'isLoading'],
  emits: ['submit', 'cancel'],
  setup() {
    return { submitPayload: SUBMIT_PAYLOAD }
  },
  template: `
    <div>
      <slot />
      <button data-test="claim-form-submit" @click="$emit('submit', submitPayload)">submit</button>
      <button data-test="claim-form-cancel" @click="$emit('cancel')">cancel</button>
    </div>
  `
}

const ModalComponentStub = {
  name: 'ModalComponent',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div><slot /></div>'
}

// Mock implementations
vi.mock('@/stores', () => ({
  useToastStore: () => mockToastStore
}))

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => mockQueryClient
}))

vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: mockUseCustomFetch
}))

// Helper function for creating wrapper
const createWrapper = (props: Partial<{ claim: Claim; teamId: number | string }> = {}) =>
  mount(EditClaimModal, {
    props: {
      claim: props.claim ?? defaultClaim,
      teamId: props.teamId ?? 42
    },
    global: {
      stubs: {
        ClaimForm: ClaimFormStub,
        ModalComponent: ModalComponentStub
      }
    }
  })

describe('EditClaimModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isFetchingValue.value = false
    payloadFactoryRef.current = undefined
    executeUpdateMock.mockReset()
    executeUpdateMock.mockResolvedValue(undefined)
    mockQueryClient.invalidateQueries.mockReset()
    mockQueryClient.invalidateQueries.mockResolvedValue(undefined)
    mockToastStore.addSuccessToast.mockReset()
    mockToastStore.addErrorToast.mockReset()

    mockUseCustomFetch.mockImplementation(() => ({
      put: (payloadFactory: () => unknown) => {
        payloadFactoryRef.current = payloadFactory
        return {
          json: () => ({
            execute: executeUpdateMock,
            isFetching: isFetchingValue
          })
        }
      }
    }))
  })

  describe('Initial Rendering', () => {
    it('should pass initial claim data to ClaimForm', () => {
      const wrapper = mount(EditClaimModal, {
        props: {
          claim: defaultClaim,
          teamId: 42
        },
        global: {
          stubs: {
            ClaimForm: ClaimFormStub,
            ModalComponent: ModalComponentStub
          }
        }
      })

      const form = wrapper.findComponent({ name: 'ClaimForm' })

      expect(form.exists()).toBe(true)
      expect(form.props()).toEqual({
        initialData: {
          hoursWorked: String(defaultClaim.hoursWorked),
          memo: defaultClaim.memo,
          dayWorked: defaultClaim.dayWorked
        },
        isEdit: true,
        isLoading: {
          value: false
        }
      })
    })

    it('should show loading state when updating', async () => {
      isFetchingValue.value = true
      const wrapper = createWrapper()
      const form = wrapper.findComponent(ClaimFormStub)

      expect(form.props('isLoading')).toEqual({ value: true })
    })
  })

  describe('Form Submission', () => {
    it('should submit claim update and close modal on success', async () => {
      // Mock successful response with status code
      mockUseCustomFetch.mockImplementation(() => ({
        put: (payloadFactory: () => unknown) => {
          payloadFactoryRef.current = payloadFactory
          return {
            json: () => ({
              execute: executeUpdateMock,
              isFetching: isFetchingValue,
              statusCode: { value: 200 } // Add status code for successful response
            })
          }
        }
      }))

      const wrapper = createWrapper({ teamId: 123 })

      await wrapper.find(SELECTORS.submitButton).trigger('click')
      await flushPromises()

      expect(executeUpdateMock).toHaveBeenCalledTimes(1)

      // Verify success toast was called
      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Claim updated successfully')

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['weekly-claims', 123]
      })
      expect(wrapper.emitted('close')).toBeTruthy()

      const payloadFactory = payloadFactoryRef.current
      expect(payloadFactory).toBeDefined()
      expect(payloadFactory?.()).toEqual(SUBMIT_PAYLOAD)
    })

    it('should show error toast when update fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const errorMessage = 'Network issue'
      executeUpdateMock.mockRejectedValueOnce(new Error(errorMessage))

      const wrapper = createWrapper()

      await wrapper.find(SELECTORS.submitButton).trigger('click')
      await flushPromises()

      expect(executeUpdateMock).toHaveBeenCalledTimes(1)
      expect(mockToastStore.addSuccessToast).not.toHaveBeenCalled()
      expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled()
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(errorMessage)
      expect(wrapper.emitted('close')).toBeUndefined()

      consoleErrorSpy.mockRestore()
    })

    it.skip('should display error message from API response', async () => {
      const apiErrorMessage = { message: 'Invalid claim data' }

      // Update the mock to match the pattern from SubmitClaims
      mockUseCustomFetch.mockImplementation(() => ({
        put: (payloadFactory: () => unknown) => {
          payloadFactoryRef.current = payloadFactory
          return {
            json: () => ({
              execute: executeUpdateMock,
              isFetching: isFetchingValue,
              error: { value: new Error('API Error') },
              response: { value: { json: () => Promise.resolve(apiErrorMessage) } },
              statusCode: { value: 400 }
            })
          }
        }
      }))

      // Trigger the error
      executeUpdateMock.mockRejectedValueOnce(new Error('API Error'))

      const wrapper = createWrapper()

      // Submit the form to trigger error
      await wrapper.find(SELECTORS.submitButton).trigger('click')
      await flushPromises()

      // Wait for the error message to be set
      await wrapper.vm.$nextTick()

      // Check error display
      const errorAlert = wrapper.find(SELECTORS.errorAlert)
      expect(errorAlert.exists()).toBe(true)
      expect(errorAlert.text()).toContain(apiErrorMessage.message)
    })
  })

  describe('Modal Interactions', () => {
    it('should emit close when ClaimForm cancel is triggered', async () => {
      const wrapper = createWrapper()

      await wrapper.find(SELECTORS.cancelButton).trigger('click')
      await flushPromises()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close when modal modelValue toggles to false', async () => {
      const wrapper = createWrapper()

      await wrapper.findComponent(ModalComponentStub).vm.$emit('update:modelValue', false)
      await flushPromises()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should reset error state when modal is closed', async () => {
      const wrapper = createWrapper()

      // First trigger an error
      executeUpdateMock.mockRejectedValueOnce(new Error('Test error'))
      await wrapper.find(SELECTORS.submitButton).trigger('click')
      await flushPromises()

      // Then close the modal
      await wrapper.findComponent(ModalComponentStub).vm.$emit('update:modelValue', false)
      await flushPromises()

      const errorAlert = wrapper.find(SELECTORS.errorAlert)
      expect(errorAlert.exists()).toBe(false)
    })
  })
})

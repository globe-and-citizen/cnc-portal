import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DeleteClaimModal from '@/components/sections/CashRemunerationView/DeleteClaimModal.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import type { Claim } from '@/types'
import dayjs from 'dayjs'
import { useDeleteClaimMutation } from '@/queries/weeklyClaim.queries'

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
const { mockUseToastStore } = vi.hoisted(() => {
  return {
    mockUseToastStore: vi.fn(() => ({
      addErrorToast: errorToastMock,
      addSuccessToast: successToastMock
    }))
  }
})

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: mockUseToastStore
  }
})

describe.skip('DeleteClaimModal', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}, mutationOverrides = {}) => {
    // Mock the delete mutation
    const mockMutateAsync = vi.fn().mockResolvedValue(undefined)
    const mockIsPending = ref(false)
    const mockError = ref(null)

    vi.mocked(useDeleteClaimMutation).mockReturnValue({
      mutateAsync: mutationOverrides.mutateAsync ?? mockMutateAsync,
      isPending: mutationOverrides.isPending ?? mockIsPending,
      error: mutationOverrides.error ?? mockError,
      mutate: vi.fn(),
      isError: ref(false),
      data: ref(null),
      reset: vi.fn()
    } as unknown as ReturnType<typeof useDeleteClaimMutation>)

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
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined)
      const wrapper = createWrapper({}, { mutateAsync: mockMutateAsync })

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')
      await flushPromises()

      expect(mockMutateAsync).toHaveBeenCalledWith({ claimId: 1 })
      expect(successToastMock).toHaveBeenCalledWith('Claim deleted successfully')
    })

    it('should emit close event after successful deletion', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined)
      const wrapper = createWrapper({}, { mutateAsync: mockMutateAsync })

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Error Handling', () => {
    it('should show error toast when deletion fails', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Network error'))
      const mockError = ref({
        response: { data: { message: 'Failed to delete claim' } }
      })
      const wrapper = createWrapper({}, { mutateAsync: mockMutateAsync, error: mockError })

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')
      await flushPromises()

      expect(errorToastMock).toHaveBeenCalled()
    })

    it('should not emit close when deletion fails', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Error'))
      const wrapper = createWrapper({}, { mutateAsync: mockMutateAsync })

      await wrapper.find('[data-test="confirm-delete-claim-button"]').trigger('click')
      await flushPromises()

      // Should not emit close on error
      expect(wrapper.emitted('close')).toBeUndefined()
    })
  })

  describe('Modal Interactions', () => {
    it('should emit close when cancel button is clicked', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="cancel-delete-claim-button"]').trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
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
})

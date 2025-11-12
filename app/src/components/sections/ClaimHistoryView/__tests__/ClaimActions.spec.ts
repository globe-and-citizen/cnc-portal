import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ClaimActions from '@/components/sections/ClaimHistoryView/ClaimActions.vue'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import EditClaims from '@/components/sections/CashRemunerationView/EditClaims.vue'
import DeleteClaimModal from '@/components/sections/CashRemunerationView/DeleteClaimModal.vue'
import type { Claim, SupportedTokens } from '@/types'

const successToastMock = vi.fn()
const errorToastMock = vi.fn()

// Mock stores
const mocks = vi.hoisted(() => ({
  mockUseTeamStore: vi.fn(() => ({
    currentTeam: { id: 1 }
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
describe('ClaimActions', () => {
  const mockClaim: Claim = {
    id: 1,
    hoursWorked: 8,
    memo: 'Test work',
    dayWorked: '2024-01-01T00:00:00.000Z',
    wageId: 1,
    wage: {
      id: 1,
      userAddress: '0x',
      teamId: 1,
      ratePerHour: [
        { type: 'native' as SupportedTokens, amount: 50 },
        { type: 'usdc' as SupportedTokens, amount: 25 },
        { type: 'sher' as SupportedTokens, amount: 25 }
      ],
      cashRatePerHour: 50,
      tokenRatePerHour: 25,
      usdcRatePerHour: 25,
      maximumHoursPerWeek: 40,
      nextWageId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const createWrapper = () => {
    return mount(ClaimActions, {
      props: {
        claim: mockClaim
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })
  interface IWrapper {
    showEditModal: boolean
    showDeleteModal: boolean
    weeklyClaimQueryKey: string
  }

  describe('Component Rendering', () => {
    it('should render action buttons', () => {
      const wrapper = createWrapper()

      expect(wrapper.find('[data-test="edit-claim-button"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="delete-claim-button"]').exists()).toBe(true)
    })

    it('should not render modals by default', () => {
      const wrapper = createWrapper()

      expect(wrapper.findComponent(EditClaims).exists()).toBe(false)
      expect(wrapper.findComponent(DeleteClaimModal).exists()).toBe(false)
    })
  })

  describe('Edit Modal', () => {
    it('should open edit modal when edit button is clicked', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()

      expect((wrapper.vm as unknown as IWrapper).showEditModal).toBe(true)
    })

    it('should close edit modal when close event is emitted', async () => {
      const wrapper = createWrapper()

      // Open modal first
      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()

      wrapper.vm.closeEditModal()
      await nextTick()

      expect((wrapper.vm as unknown as IWrapper).showEditModal).toBe(false)
    })

    it('should pass correct props to edit modal', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()

      const editModal = wrapper.findComponent(EditClaims)
      expect(editModal.props('claim')).toEqual(mockClaim)
      expect(editModal.props('teamId')).toBe(1)
    })
  })

  describe('Delete Modal', () => {
    it('should open delete modal when delete button is clicked', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()

      expect((wrapper.vm as unknown as IWrapper).showDeleteModal).toBe(true)
    })

    it('should close delete modal when close event is emitted', async () => {
      const wrapper = createWrapper()

      // Open modal first
      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()

      wrapper.vm.closeDeleteModal()
      await nextTick()

      expect((wrapper.vm as unknown as IWrapper).showDeleteModal).toBe(false)
    })

    it('should pass correct props to delete modal', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()

      const deleteModal = wrapper.findComponent(DeleteClaimModal)
      expect(deleteModal.props('claim')).toEqual(mockClaim)
      expect(deleteModal.props('queryKey')).toEqual(['weekly-claims', 1])
    })
  })

  describe('Team Store Integration', () => {
    it('should compute weekly claim query key from team id', () => {
      const wrapper = createWrapper()
      expect((wrapper.vm as unknown as IWrapper).weeklyClaimQueryKey).toEqual(['weekly-claims', 1])
    })
  })

  describe('Exposed Methods', () => {
    it('should expose modal control methods', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.openEditModal).toBeDefined()
      expect(wrapper.vm.openDeleteModal).toBeDefined()
      expect(wrapper.vm.closeEditModal).toBeDefined()
      expect(wrapper.vm.closeDeleteModal).toBeDefined()
    })

    it('should handle modal state changes through exposed methods', async () => {
      const wrapper = createWrapper()

      wrapper.vm.openEditModal()
      await nextTick()
      expect((wrapper.vm as unknown as IWrapper).showEditModal).toBe(true)

      wrapper.vm.closeEditModal()
      await nextTick()
      expect((wrapper.vm as unknown as IWrapper).showEditModal).toBe(false)

      wrapper.vm.openDeleteModal()
      await nextTick()
      expect((wrapper.vm as unknown as IWrapper).showDeleteModal).toBe(true)

      wrapper.vm.closeDeleteModal()
      await nextTick()
      expect((wrapper.vm as unknown as IWrapper).showDeleteModal).toBe(false)
    })
  })
})

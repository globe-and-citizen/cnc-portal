import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ClaimActions from '@/components/sections/ClaimHistoryView/ClaimActions.vue'
import { nextTick } from 'vue'
import { mockTeamStore, mockToast } from '@/tests/mocks'

import type { Claim, SupportedTokens } from '@/types'

describe('[US-PAYROLL-006] [US-PAYROLL-007] ClaimActions', () => {
  const mockClaim: Claim = {
    id: 1,
    hoursWorked: 480,
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

  const createWrapper = (weekClaims: Claim[] = [], weeklyGoals: string | null = null) => {
    return mount(ClaimActions, {
      props: {
        claim: mockClaim,
        weekClaims,
        weeklyGoals
      },
      global: {
        stubs: {
          UModal: {
            name: 'UModal',
            props: ['open'],
            emits: ['update:open'],
            template: `
              <div data-test="u-modal">
                <slot v-if="open" name="body" />
              </div>
            `
          },
          EditClaims: {
            name: 'EditClaims',
            template: '<div data-test="edit-claims-stub" />',
            props: ['claim', 'weekClaims'],
            emits: ['close']
          },
          DeleteClaimConfirmation: {
            name: 'DeleteClaimConfirmation',
            template: '<div data-test="delete-claim-stub" />',
            props: ['claim'],
            emits: ['close']
          }
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders action buttons', () => {
      const wrapper = createWrapper()

      expect(wrapper.find('[data-test="edit-claim-button"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="delete-claim-button"]').exists()).toBe(true)
    })

    it('does not render modals by default', () => {
      const wrapper = createWrapper()

      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'DeleteClaimConfirmation' }).exists()).toBe(false)
    })
  })

  describe('Edit Modal', () => {
    it('opens edit modal when edit button is clicked', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()

      const editModal = wrapper.findComponent({ name: 'EditClaims' })
      expect(editModal.exists()).toBe(true)
    })

    it('passes the claim and its week siblings to edit modal', async () => {
      const siblingClaim: Claim = { ...mockClaim, id: 2, minutesWorked: 120 }
      const wrapper = createWrapper([mockClaim, siblingClaim])

      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()

      const editModal = wrapper.findComponent({ name: 'EditClaims' })
      expect(editModal.props('claim')).toEqual(mockClaim)
      expect(editModal.props('weekClaims')).toEqual([mockClaim, siblingClaim])
    })
  })

  describe('[AC-US-PAYROLL-015-04] weekly goals required by the team', () => {
    const teamMetaBefore = mockTeamStore.currentTeamMeta
    const editWarning = {
      title: 'Weekly goals required',
      description: 'Submit your weekly goals for this week before editing a claim.',
      color: 'warning'
    }

    beforeEach(() => {
      mockTeamStore.currentTeamMeta = {
        ...teamMetaBefore,
        data: { ...teamMetaBefore.data, requireWeeklyGoals: true }
      } as typeof mockTeamStore.currentTeamMeta
    })

    afterEach(() => {
      mockTeamStore.currentTeamMeta = teamMetaBefore
    })

    it('warns and keeps the edit form closed when the week has no goals', async () => {
      const wrapper = createWrapper([], '   ')

      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()

      expect(mockToast.add).toHaveBeenCalledWith(editWarning)
      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(false)
    })

    it('opens the edit form once the week has goals', async () => {
      const wrapper = createWrapper([], 'Ship the guard')

      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()

      expect(mockToast.add).not.toHaveBeenCalledWith(editWarning)
      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(true)
    })

    it('still lets the member delete a claim of a week without goals', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()

      expect(wrapper.findComponent({ name: 'DeleteClaimConfirmation' }).exists()).toBe(true)
    })
  })

  describe('Delete Modal', () => {
    it('opens delete modal when delete button is clicked', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()

      const deleteModal = wrapper.findComponent({ name: 'DeleteClaimConfirmation' })
      expect(deleteModal.exists()).toBe(true)
    })

    it('passes correct props to delete modal', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()

      const deleteModal = wrapper.findComponent({ name: 'DeleteClaimConfirmation' })
      expect(deleteModal.props('claim')).toEqual(mockClaim)
    })
  })

  describe('Modal State Management', () => {
    it('maintains independent state for edit and delete modals', async () => {
      const wrapper = createWrapper()

      // Open edit modal
      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()

      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'DeleteClaimConfirmation' }).exists()).toBe(false)

      // Close edit modal
      const editModal = wrapper.findComponent({ name: 'EditClaims' })
      editModal.vm.$emit('close')
      await nextTick()

      // Open delete modal
      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()

      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'DeleteClaimConfirmation' }).exists()).toBe(true)
    })
  })

  describe('Button Interactions', () => {
    it('renders edit button with correct styling', () => {
      const wrapper = createWrapper()
      const editButton = wrapper.find('[data-test="edit-claim-button"]')

      expect(editButton.exists()).toBe(true)
      expect(editButton.find('[data-test="u-icon"]').exists()).toBe(true)
    })

    it('renders delete button with correct styling', () => {
      const wrapper = createWrapper()
      const deleteButton = wrapper.find('[data-test="delete-claim-button"]')

      expect(deleteButton.exists()).toBe(true)
    })

    it('keeps the edit modal open after repeated edit clicks', async () => {
      const wrapper = createWrapper()

      // Click edit button multiple times
      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()

      // Modal should still be open
      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(true)
    })
  })
})

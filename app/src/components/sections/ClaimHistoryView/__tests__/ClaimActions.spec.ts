import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ClaimActions from '@/components/sections/ClaimHistoryView/ClaimActions.vue'
import { nextTick } from 'vue'

import type { Claim, SupportedTokens } from '@/types'

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
        stubs: {
          EditClaims: {
            name: 'EditClaims',
            template: '<div data-test="edit-claims-stub" />',
            props: ['claim'],
            emits: ['close']
          },
          DeleteClaimModal: {
            name: 'DeleteClaimModal',
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
    it('should render action buttons', () => {
      const wrapper = createWrapper()

      expect(wrapper.find('[data-test="edit-claim-button"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="delete-claim-button"]').exists()).toBe(true)
    })

    it('should not render modals by default', () => {
      const wrapper = createWrapper()

      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'DeleteClaimModal' }).exists()).toBe(false)
    })
  })

  describe('Edit Modal', () => {
    it('should open edit modal when edit button is clicked', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()

      const editModal = wrapper.findComponent({ name: 'EditClaims' })
      expect(editModal.exists()).toBe(true)
    })

    it.skip('should close edit modal when close event is emitted', async () => {
      const wrapper = createWrapper()

      // Open modal first
      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()

      const editModal = wrapper.findComponent({ name: 'EditClaims' })
      expect(editModal.exists()).toBe(true)

      // Emit close event
      editModal.vm.$emit('close')
      await nextTick()

      // Modal should be closed
      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(false)
    })

    it('should pass correct props to edit modal', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()

      const editModal = wrapper.findComponent({ name: 'EditClaims' })
      expect(editModal.props('claim')).toEqual(mockClaim)
    })
  })

  describe('Delete Modal', () => {
    it('should open delete modal when delete button is clicked', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()

      const deleteModal = wrapper.findComponent({ name: 'DeleteClaimModal' })
      expect(deleteModal.exists()).toBe(true)
    })

    it.skip('should close delete modal when close event is emitted', async () => {
      const wrapper = createWrapper()

      // Open modal first
      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()

      const deleteModal = wrapper.findComponent({ name: 'DeleteClaimModal' })
      expect(deleteModal.exists()).toBe(true)

      // Emit close event
      deleteModal.vm.$emit('close')
      await nextTick()

      // Modal should be closed
      expect(wrapper.findComponent({ name: 'DeleteClaimModal' }).exists()).toBe(false)
    })

    it('should pass correct props to delete modal', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()

      const deleteModal = wrapper.findComponent({ name: 'DeleteClaimModal' })
      expect(deleteModal.props('claim')).toEqual(mockClaim)
    })
  })

  describe('Modal State Management', () => {
    it('should maintain independent state for edit and delete modals', async () => {
      const wrapper = createWrapper()

      // Open edit modal
      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()

      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'DeleteClaimModal' }).exists()).toBe(false)

      // Close edit modal
      const editModal = wrapper.findComponent({ name: 'EditClaims' })
      editModal.vm.$emit('close')
      await nextTick()

      // Open delete modal
      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()

      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'DeleteClaimModal' }).exists()).toBe(true)
    })

    it.skip('should allow both modals to be opened and closed independently', async () => {
      const wrapper = createWrapper()

      // Open both modals
      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()
      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()

      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'DeleteClaimModal' }).exists()).toBe(true)

      // Close edit modal
      const editModal = wrapper.findComponent({ name: 'EditClaims' })
      editModal.vm.$emit('close')
      await nextTick()

      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'DeleteClaimModal' }).exists()).toBe(true)

      // Close delete modal
      const deleteModal = wrapper.findComponent({ name: 'DeleteClaimModal' })
      deleteModal.vm.$emit('close')
      await nextTick()

      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'DeleteClaimModal' }).exists()).toBe(false)
    })
  })

  describe('Button Interactions', () => {
    it('should render edit button with correct styling', () => {
      const wrapper = createWrapper()
      const editButton = wrapper.find('[data-test="edit-claim-button"]')

      expect(editButton.exists()).toBe(true)
      expect(editButton.find('[data-test="u-icon"]').exists()).toBe(true)
    })

    it('should render delete button with correct styling', () => {
      const wrapper = createWrapper()
      const deleteButton = wrapper.find('[data-test="delete-claim-button"]')

      expect(deleteButton.exists()).toBe(true)
    })

    it('should handle multiple button clicks correctly', async () => {
      const wrapper = createWrapper()

      // Click edit button multiple times
      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()

      // Modal should still be open
      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(true)
    })
  })

  describe('Modal v-model binding', () => {
    it.skip('should respond to v-model changes on UModal (edit)', async () => {
      const wrapper = createWrapper()

      // Open via button
      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()
      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(true)

      // Find UModal for edit and emit update to close
      const editModalWrapper = wrapper.findComponent({ name: 'UModal' })
      // Our stub supports update:open
      editModalWrapper.vm.$emit('update:open', false)
      await nextTick()

      expect(wrapper.findComponent({ name: 'EditClaims' }).exists()).toBe(false)
    })

    it.skip('should respond to v-model changes on UModal (delete)', async () => {
      const wrapper = createWrapper()

      // Open via button
      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()
      expect(wrapper.findComponent({ name: 'DeleteClaimModal' }).exists()).toBe(true)

      // Get the second UModal (delete)
      const modalComponents = wrapper.findAllComponents({ name: 'UModal' })
      const deleteModalWrapper = modalComponents[1]
      deleteModalWrapper.vm.$emit('update:open', false)
      await nextTick()

      expect(wrapper.findComponent({ name: 'DeleteClaimModal' }).exists()).toBe(false)
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ClaimActions from '@/components/sections/ClaimHistoryView/ClaimActions.vue'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import EditClaims from '@/components/sections/CashRemunerationView/EditClaims.vue'
import DeleteClaimModal from '@/components/sections/CashRemunerationView/DeleteClaimModal.vue'

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
    const queryClient = new QueryClient()
    return mount(ClaimActions, {
      props: {
        claim: mockClaim
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]],
        stubs: {
          ModalComponent: {
            name: 'ModalComponent',
            template: '<div v-if="modelValue"><slot /></div>',
            props: ['modelValue'],
            emits: ['update:modelValue']
          }
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Modal State Management', () => {
    it('should allow both modals to be opened and closed independently', async () => {
      const wrapper = createWrapper()

      // Open both modals
      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()
      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()

      expect(wrapper.findComponent(EditClaims).exists()).toBe(true)
      expect(wrapper.findComponent(DeleteClaimModal).exists()).toBe(true)

      // Close edit modal
      const editModal = wrapper.findComponent(EditClaims)
      editModal.vm.$emit('close')
      await nextTick()

      expect(wrapper.findComponent(EditClaims).exists()).toBe(false)
      expect(wrapper.findComponent(DeleteClaimModal).exists()).toBe(true)

      // Close delete modal
      const deleteModal = wrapper.findComponent(DeleteClaimModal)
      deleteModal.vm.$emit('close')
      await nextTick()

      expect(wrapper.findComponent(EditClaims).exists()).toBe(false)
      expect(wrapper.findComponent(DeleteClaimModal).exists()).toBe(false)
    })
  })

  describe('Modal v-model binding', () => {
    it('should respond to v-model changes on ModalComponent (edit)', async () => {
      const wrapper = createWrapper()

      // Open via button
      await wrapper.find('[data-test="edit-claim-button"]').trigger('click')
      await nextTick()
      expect(wrapper.findComponent(EditClaims).exists()).toBe(true)

      // Find ModalComponent for edit and emit update to close
      const editModalWrapper = wrapper.findComponent({ name: 'ModalComponent' })
      // Our stub supports update:modelValue
      editModalWrapper.vm.$emit('update:modelValue', false)
      await nextTick()

      expect(wrapper.findComponent(EditClaims).exists()).toBe(false)
    })

    it('should respond to v-model changes on ModalComponent (delete)', async () => {
      const wrapper = createWrapper()

      // Open via button
      await wrapper.find('[data-test="delete-claim-button"]').trigger('click')
      await nextTick()
      expect(wrapper.findComponent(DeleteClaimModal).exists()).toBe(true)

      // Get the second ModalComponent (delete)
      const modalComponents = wrapper.findAllComponents({ name: 'ModalComponent' })
      const deleteModalWrapper = modalComponents[1]
      deleteModalWrapper.vm.$emit('update:modelValue', false)
      await nextTick()

      expect(wrapper.findComponent(DeleteClaimModal).exists()).toBe(false)
    })
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import DepositModal from '../DepositModal.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import DepositBankForm from '../DepositBankForm.vue'
import { Icon as IconifyIcon } from '@iconify/vue'

describe('DepositModal', () => {
  let wrapper: VueWrapper

  // Mock test data
  const mockBankAddress = '0x1234567890123456789012345678901234567890' as const

  // Test selectors
  const SELECTORS = {
    depositButton: '[data-test="deposit-button"]',
    depositModal: '[data-test="deposit-modal"]'
  } as const

  // Helper function to create component
  const mountComponent = (props = {}) => {
    return mount(DepositModal, {
      props: {
        bankAddress: mockBankAddress,
        ...props
      },
      global: {
        components: {
          ButtonUI,
          ModalComponent,
          DepositBankForm,
          IconifyIcon
        },
        stubs: {
          DepositBankForm: true
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Edge Cases', () => {
    it('should handle closing modal that is not open', () => {
      wrapper = mountComponent()

      // Try to close without opening
      expect(() => {
        // This shouldn't throw
        wrapper.vm.closeModal()
      }).not.toThrow()
    })

    it('should maintain proper state when component is remounted', async () => {
      wrapper = mountComponent()

      await wrapper.find(SELECTORS.depositButton).trigger('click')
      await nextTick()
      expect(wrapper.find(SELECTORS.depositModal).exists()).toBe(true)

      // Unmount and remount
      wrapper.unmount()
      wrapper = mountComponent()

      // Modal should be closed after remount
      expect(wrapper.find(SELECTORS.depositModal).exists()).toBe(false)
    })
  })
})

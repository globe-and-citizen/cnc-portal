import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import { type Address } from 'viem'
import { WagmiPlugin, createConfig, http } from '@wagmi/vue'
import { mainnet } from 'viem/chains'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import DepositSafeForm from '@/components/forms/DepositSafeForm.vue'
import {
  mockToastStore,
  mockTransactionFunctions,
  mockUseSafeSendTransaction,
  mockERC20Reads,
  mockERC20Writes,
  resetTransactionMocks,
  resetERC20Mocks,
  transferHash
} from '@/tests/mocks'

// Wagmi config for testing
const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

const queryClient = new QueryClient()

describe('DepositSafeForm.vue', () => {
  const defaultProps = {
    safeAddress: '0xsafeaddress000000000000000000000000' as Address
  }

  const createWrapper = (overrides = {}) =>
    mount(DepositSafeForm, {
      props: { ...defaultProps, ...overrides },
      global: {
        plugins: [
          createTestingPinia({ createSpy: vi.fn }),
          [WagmiPlugin, { config: wagmiConfig }],
          [VueQueryPlugin, { queryClient }]
        ]
      }
    })

  // Helper function to set TokenAmount values
  const setTokenAmount = async (
    wrapper: ReturnType<typeof createWrapper>,
    value: string,
    tokenId: string,
    isValid: boolean = true
  ): Promise<void> => {
    const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
    await tokenAmount.vm.$emit('update:modelValue', value)
    await tokenAmount.vm.$emit('update:modelToken', tokenId)
    await tokenAmount.vm.$emit('validation', isValid)
    await nextTick()
  }

  beforeEach(() => {
    // Reset all mocks using the global reset functions
    resetTransactionMocks()
    resetERC20Mocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('User Interactions', () => {
    it('should emit closeModal and reset form when cancel button is clicked', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '100', 'usdc', true)

      await wrapper.find('[data-test="cancel-button"]').trigger('click')

      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })

    it('should not submit when form is invalid', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '1', 'native', false)

      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockTransactionFunctions.mockSendTransaction).not.toHaveBeenCalled()
    })
  })

  describe('Native Token Deposit', () => {
    it('should show success toast and close modal after native deposit confirmation', async () => {
      mockTransactionFunctions.mockSendTransaction.mockResolvedValueOnce({ hash: '0xnativetx' })
      const wrapper = createWrapper()

      await setTokenAmount(wrapper, '1', 'native', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      // Simulate transaction confirmation
      mockUseSafeSendTransaction.isConfirmed.value = true
      mockUseSafeSendTransaction.receipt.value = { status: 'success' }
      await nextTick()

      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
        expect.stringContaining('deposited successfully')
      )
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })

    it('should prevent multiple submissions while loading', async () => {
      mockUseSafeSendTransaction.isLoading.value = true
      const wrapper = createWrapper()

      await setTokenAmount(wrapper, '1', 'native', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockTransactionFunctions.mockSendTransaction).not.toHaveBeenCalled()
    })
  })

  describe('ERC20 Token Deposit - With Sufficient Allowance', () => {
    it('should show success toast and close modal after ERC20 deposit', async () => {
      mockERC20Reads.allowance.data.value = 1000000n
      mockTransactionFunctions.mockWriteContractAsync.mockResolvedValueOnce('0xtransfertx')
      transferHash.value = '0xtransfertx'

      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '100', 'usdc', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await flushPromises()

      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
        expect.stringContaining('deposited successfully')
      )
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })
  })

  describe('ERC20 Token Deposit - With Insufficient Allowance', () => {
    it('should handle approval errors gracefully', async () => {
      mockERC20Reads.allowance.data.value = 0n

      // Simulate approval error
      mockERC20Writes.approve.writeResult.error.value = new Error('Approval failed')

      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '100', 'usdc', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await flushPromises()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to deposit usdc')
    })
  })

  describe('Edge Cases', () => {
    it('should handle NaN amount gracefully', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, 'invalid', 'usdc', false)

      // Should convert to 0n
      expect(wrapper.vm.bigIntAmount).toBe(0n)
    })

    it('should handle zero allowance correctly', async () => {
      mockERC20Reads.allowance.data.value = 0n

      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '100', 'usdc', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      // Should trigger approval flow
      expect(mockERC20Writes.approve.executeWrite).toHaveBeenCalled()
    })
  })
})

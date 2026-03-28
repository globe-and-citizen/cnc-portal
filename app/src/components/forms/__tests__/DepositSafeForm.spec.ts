import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { nextTick, type ComponentPublicInstance } from 'vue'
import { type Address } from 'viem'
import DepositSafeForm from '@/components/forms/DepositSafeForm.vue'
import {
  mockTransactionFunctions,
  mockUseSafeSendTransaction,
  mockERC20Reads,
  mockERC20Writes,
  resetTransactionMocks,
  resetERC20Mocks,
  transferHash,
  mockUseWriteContract,
  mockWagmiCore
} from '@/tests/mocks'

describe('DepositSafeForm.vue', () => {
  const defaultProps = {
    safeAddress: '0xsafeaddress000000000000000000000000' as Address,
    title: 'Deposit to Safe'
  }

  const createWrapper = (overrides = {}) =>
    mount(DepositSafeForm, {
      props: { ...defaultProps, ...overrides },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  type DepositSafeFormTestVm = ComponentPublicInstance & {
    selectedTokenId: string
    isAmountValid: boolean
    submitForm: () => Promise<void>
    bigIntAmount: bigint
  }

  const configureErc20Submit = async (wrapper: ReturnType<typeof createWrapper>): Promise<void> => {
    const vm = wrapper.vm as unknown as DepositSafeFormTestVm
    vm.selectedTokenId = 'usdc'
    vm.isAmountValid = true
    await vm.submitForm()
  }

  // Helper function to set TokenAmount values
  const setTokenAmount = async (
    wrapper: ReturnType<typeof createWrapper>,
    value: string,
    tokenId: string,
    isValid: boolean = true
  ): Promise<void> => {
    const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
    await tokenAmount.vm.$emit('update:modelValue', { amount: value, tokenId })
    await tokenAmount.vm.$emit('validation', isValid)
    await nextTick()
  }

  beforeEach(() => {
    // Reset all mocks using the global reset functions
    resetTransactionMocks()
    resetERC20Mocks()
    transferHash.value = undefined
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
      mockUseWriteContract.mutateAsync.mockResolvedValueOnce('0xtransfertx')
      mockWagmiCore.waitForTransactionReceipt.mockResolvedValueOnce({ status: 'success' })
      transferHash.value = '0xtransfertx'

      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '1', 'usdc', true)
      await configureErc20Submit(wrapper)
      await flushPromises()

      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })
  })

  describe('ERC20 Token Deposit - With Insufficient Allowance', () => {
    it('should handle approval errors gracefully', async () => {
      mockERC20Reads.allowance.data.value = 0n

      // Simulate approval error
      mockERC20Writes.approve.writeResult.error.value = new Error('Approval failed')

      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '1', 'usdc', true)
      await configureErc20Submit(wrapper)
      await flushPromises()
    })
  })

  describe('Edge Cases', () => {
    it('should handle NaN amount gracefully', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, 'invalid', 'usdc', false)

      // Should convert to 0n
      expect((wrapper.vm as unknown as DepositSafeFormTestVm).bigIntAmount).toBe(0n)
    })

    it('should handle zero allowance correctly', async () => {
      mockERC20Reads.allowance.data.value = 0n

      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '1', 'usdc', true)
      await configureErc20Submit(wrapper)
      await flushPromises()

      // Should trigger approval flow
      expect(mockERC20Writes.approve.executeWrite).toHaveBeenCalled()
    })
  })
})

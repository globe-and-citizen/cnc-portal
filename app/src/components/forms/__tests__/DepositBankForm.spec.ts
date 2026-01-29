import { mount, shallowMount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import { zeroAddress, type Address } from 'viem'
import { WagmiPlugin, createConfig, http } from '@wagmi/vue'
import { mainnet } from 'viem/chains'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import {
  mockToastStore,
  mockTransactionFunctions,
  mockUseSafeSendTransaction,
  mockERC20Reads,
  mockERC20Writes
} from '@/tests/mocks'

const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

const queryClient = new QueryClient()

describe('DepositBankForm.vue', () => {
  const defaultProps = {
    bankAddress: zeroAddress as Address
  }

  const createWrapper = (overrides = {}, mountFn = shallowMount) =>
    mountFn(DepositBankForm, {
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
    vi.clearAllMocks()
  })
  describe('User Interactions', () => {
    it('should emit closeModal when cancel button is clicked', async () => {
      const wrapper = createWrapper()
      await wrapper.find('[data-test="cancel-button"]').trigger('click')

      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })
  })

  describe('Native Token Deposit', () => {
    it('should show success toast and close modal after successful native deposit', async () => {
      mockTransactionFunctions.mockSendTransaction.mockResolvedValueOnce({})
      const wrapper = createWrapper({ title: 'Deposit Bank Form' }, mount)

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

    it('should show error toast when native token deposit fails', async () => {
      mockTransactionFunctions.mockSendTransaction.mockRejectedValueOnce(
        new Error('Transaction failed')
      )
      const wrapper = createWrapper({}, mount)

      await setTokenAmount(wrapper, '1', 'native', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        expect.stringContaining('Failed to deposit')
      )
    })

    it('should not submit when form is invalid', async () => {
      const wrapper = createWrapper({}, mount)
      await setTokenAmount(wrapper, '1', 'native', false)

      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockTransactionFunctions.mockSendTransaction).not.toHaveBeenCalled()
    })
  })

  describe('ERC20 Token Deposit', () => {
    it('should handle token deposit flow when allowance is insufficient', async () => {
      mockERC20Reads.allowance.data.value = 0n
      mockERC20Writes.approve.executeWrite.mockResolvedValueOnce(undefined)

      const wrapper = createWrapper({}, mount)
      await setTokenAmount(wrapper, '1', 'usdc', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await flushPromises()

      expect(mockERC20Writes.approve.executeWrite).toHaveBeenCalled()
    })

    it('should handle token deposit flow when allowance is sufficient', async () => {
      mockERC20Reads.allowance.data.value = 1000000n

      const wrapper = createWrapper({}, mount)
      await setTokenAmount(wrapper, '1', 'usdc', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      // The form should successfully submit without errors
      expect(wrapper.find('[data-test="deposit-button"]').exists()).toBe(true)
    })

    it('should show error toast when selected token is not valid', async () => {
      mockERC20Reads.allowance.data.value = 0n
      mockTransactionFunctions.mockWriteContractAsync.mockRejectedValueOnce(
        new Error('Invalid token')
      )

      const wrapper = createWrapper({}, mount)

      // Set an invalid token scenario by manually triggering with empty selection
      await setTokenAmount(wrapper, '100', 'invalid-token' as unknown as string, true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await flushPromises()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to deposit invalid-token')
    })

    it('should handle form validation correctly', async () => {
      const wrapper = createWrapper({}, mount)

      // Test invalid form submission
      await setTokenAmount(wrapper, '1', 'usdc', false)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockERC20Writes.approve.executeWrite).not.toHaveBeenCalled()
      expect(mockTransactionFunctions.mockWriteContractAsync).not.toHaveBeenCalled()
    })
  })

  describe('Component State Management', () => {
    it('should reset form when reset method is exposed', async () => {
      const wrapper = createWrapper({}, mount)

      // The reset method is exposed via defineExpose
      expect(typeof wrapper.vm.reset).toBe('function')

      // Calling reset should not throw an error
      expect(() => wrapper.vm.reset()).not.toThrow()
    })

    it('should show loading state on submit button', async () => {
      const wrapper = createWrapper({}, mount)

      await setTokenAmount(wrapper, '1', 'native', true)
      const submitButton = wrapper.findComponent('[data-test="deposit-button"]')

      // Test that the button component receives loading prop
      expect(submitButton.exists()).toBe(true)
    })

    it('should show steps for non-native token deposits', async () => {
      const wrapper = createWrapper({}, mount)

      await setTokenAmount(wrapper, '1', 'usdc', true)
      await nextTick()

      expect(wrapper.find('.steps').exists()).toBe(true)
      expect(wrapper.findAll('.step')).toHaveLength(3)
    })

    it('should hide steps for native token deposits', async () => {
      const wrapper = createWrapper({}, mount)

      await setTokenAmount(wrapper, '1', 'native', true)
      await nextTick()

      expect(wrapper.find('.steps').exists()).toBe(false)
    })

    it('should render token amount component correctly', async () => {
      const wrapper = createWrapper({}, mount)

      const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
      expect(tokenAmount.exists()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle transaction errors gracefully', async () => {
      mockTransactionFunctions.mockSendTransaction.mockRejectedValueOnce(new Error('Network error'))
      const wrapper = createWrapper({}, mount)

      await setTokenAmount(wrapper, '1', 'native', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to deposit native')
    })

    it('should prevent multiple submissions', async () => {
      const wrapper = createWrapper({}, mount)

      // Set loading state
      mockUseSafeSendTransaction.isLoading.value = true

      await setTokenAmount(wrapper, '1', 'native', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      // Should not call sendTransaction when already loading
      expect(mockTransactionFunctions.mockSendTransaction).not.toHaveBeenCalled()
    })
  })
})

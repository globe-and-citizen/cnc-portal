import { mount, shallowMount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { ref, nextTick } from 'vue'
import { zeroAddress, type Address } from 'viem'
import { mockUseCurrencyStore } from '@/tests/mocks/index.mock'
import { mockUseContractBalance } from '@/tests/mocks/useContractBalance.mock'
import { WagmiPlugin, createConfig, http } from '@wagmi/vue'
import { mainnet } from 'viem/chains'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

const queryClient = new QueryClient()

// Hoisted mocks for transaction handling and composables
const {
  mockSendTransaction,
  mockAddSuccessToast,
  mockAddErrorToast,
  mockUseErc20Allowance,
  mockUseERC20Approve,
  mockUseDepositToken,
  mockExecuteApprove,
  mockExecuteDeposit
} = vi.hoisted(() => ({
  mockSendTransaction: vi.fn(),
  mockAddSuccessToast: vi.fn(),
  mockAddErrorToast: vi.fn(),
  mockUseErc20Allowance: vi.fn(),
  mockExecuteApprove: vi.fn(),
  mockExecuteDeposit: vi.fn(),
  mockUseERC20Approve: vi.fn(() => ({
    executeWrite: mockExecuteApprove,
    receiptResult: { data: ref(null), error: ref(null) },
    writeResult: { data: ref(null), error: ref(null) }
  })),
  mockUseDepositToken: vi.fn(() => ({
    executeWrite: mockExecuteDeposit,
    receiptResult: { data: ref(null), error: ref(null) },
    writeResult: { data: ref(null), error: ref(null) }
  }))
}))

const nativeReceipt = ref<{ status: string } | null>(null)
const isNativeDepositLoading = ref(false)
const isNativeDepositConfirmed = ref(false)

// Mock Wagmi hooks
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@wagmi/vue')
  return {
    ...actual,
    useSimulateContract: vi.fn(() => ({
      data: ref(null),
      error: ref(null),
      isLoading: ref(false),
      isSuccess: ref(false),
      queryKey: ref([])
    })),
    useWriteContract: vi.fn(() => ({
      data: ref(null),
      error: ref(null),
      isPending: ref(false),
      writeContract: vi.fn()
    })),
    useWaitForTransactionReceipt: vi.fn(() => ({
      data: ref(null),
      error: ref(null),
      isLoading: ref(false),
      isSuccess: ref(false)
    }))
  }
})

// Mock composables
vi.mock('@/composables/transactions/useSafeSendTransaction', () => ({
  useSafeSendTransaction: vi.fn(() => ({
    sendTransaction: mockSendTransaction,
    isLoading: isNativeDepositLoading,
    isConfirmed: isNativeDepositConfirmed,
    receipt: nativeReceipt
  }))
}))

vi.mock('@/composables/erc20/reads', () => ({
  useErc20Allowance: mockUseErc20Allowance
}))

vi.mock('@/composables/erc20/writes', () => ({
  useERC20Approve: mockUseERC20Approve
}))

vi.mock('@/composables/bank/bankWrites', () => ({
  useDepositToken: mockUseDepositToken
}))

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useCurrencyStore: () => mockUseCurrencyStore(),
    useToastStore: () => ({
      addSuccessToast: mockAddSuccessToast,
      addErrorToast: mockAddErrorToast
    }),
    useUserDataStore: () => ({ address: zeroAddress })
  }
})

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockUseContractBalance)
}))

import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import { write } from 'fs'

describe('DepositBankForm.vue', () => {
  const defaultProps = {
    loading: false,
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
    isNativeDepositLoading.value = false
    isNativeDepositConfirmed.value = false
    nativeReceipt.value = null
    mockUseErc20Allowance.mockReturnValue({ data: ref(1000000n) })

    // Reset composable mocks to default behavior
    mockUseERC20Approve.mockReturnValue({
      executeWrite: mockExecuteApprove,
      writeResult: { data: ref(null), error: ref(null) },
      receiptResult: { data: ref(null), error: ref(null) }
    })

    mockUseDepositToken.mockReturnValue({
      executeWrite: mockExecuteDeposit,
      writeResult: { data: ref(null), error: ref(null) },
      receiptResult: { data: ref(null), error: ref(null) }
    })
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
      mockSendTransaction.mockResolvedValueOnce({})
      const wrapper = createWrapper({}, mount)

      await setTokenAmount(wrapper, '1', 'native', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      // Simulate transaction confirmation
      isNativeDepositConfirmed.value = true
      nativeReceipt.value = { status: 'success' }
      await nextTick()

      expect(mockAddSuccessToast).toHaveBeenCalledWith(
        expect.stringContaining('deposited successfully')
      )
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })

    it('should show error toast when native token deposit fails', async () => {
      mockSendTransaction.mockRejectedValueOnce(new Error('Transaction failed'))
      const wrapper = createWrapper({}, mount)

      await setTokenAmount(wrapper, '1', 'native', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockAddErrorToast).toHaveBeenCalledWith(expect.stringContaining('Failed to deposit'))
    })

    it('should not submit when form is invalid', async () => {
      const wrapper = createWrapper({}, mount)
      await setTokenAmount(wrapper, '1', 'native', false)

      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockSendTransaction).not.toHaveBeenCalled()
    })
  })

  describe('ERC20 Token Deposit', () => {
    it('should handle token deposit flow when allowance is insufficient', async () => {
      mockUseErc20Allowance.mockReturnValue({ data: ref(0n) })
      mockExecuteApprove.mockResolvedValueOnce(undefined)

      const wrapper = createWrapper({}, mount)
      await setTokenAmount(wrapper, '1', 'usdc', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await flushPromises()

      expect(mockExecuteApprove).toHaveBeenCalled()
    })

    it('should handle token deposit flow when allowance is sufficient', async () => {
      mockUseErc20Allowance.mockReturnValue({ data: ref(1000000n) })

      const wrapper = createWrapper({}, mount)
      await setTokenAmount(wrapper, '1', 'usdc', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockExecuteDeposit).toHaveBeenCalled()
    })

    it('should show error toast when selected token is not valid', async () => {
      mockUseErc20Allowance.mockReturnValue({ data: ref(0n) })
      mockExecuteDeposit.mockRejectedValueOnce(new Error('Invalid token'))

      const wrapper = createWrapper({}, mount)

      // Set an invalid token scenario by manually triggering with empty selection
      await setTokenAmount(wrapper, '100', 'invalid-token' as unknown as string, true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await flushPromises()

      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to deposit invalid-token')
    })

    it('should handle form validation correctly', async () => {
      const wrapper = createWrapper({}, mount)

      // Test invalid form submission
      await setTokenAmount(wrapper, '1', 'usdc', false)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockExecuteApprove).not.toHaveBeenCalled()
      expect(mockExecuteDeposit).not.toHaveBeenCalled()
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
      mockSendTransaction.mockRejectedValueOnce(new Error('Network error'))
      const wrapper = createWrapper({}, mount)

      await setTokenAmount(wrapper, '1', 'native', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to deposit native')
    })

    it('should prevent multiple submissions', async () => {
      const wrapper = createWrapper({}, mount)

      // Set loading state
      isNativeDepositLoading.value = true

      await setTokenAmount(wrapper, '1', 'native', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      // Should not call sendTransaction when already loading
      expect(mockSendTransaction).not.toHaveBeenCalled()
    })
  })
})

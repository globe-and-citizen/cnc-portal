import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { ref, nextTick } from 'vue'
import { type Address } from 'viem'
import { mockUseContractBalance } from '@/tests/mocks/useContractBalance.mock'
import { WagmiPlugin, createConfig, http } from '@wagmi/vue'
import { mainnet } from 'viem/chains'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

// Wagmi config for testing
const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

const queryClient = new QueryClient()

// Hoisted mocks
const {
  mockSendTransaction,
  mockAddSuccessToast,
  mockAddErrorToast,
  mockUseErc20Allowance,
  mockUseERC20Approve,
  mockExecuteApprove,
  mockWriteContractAsync,
  mockInvalidateQueries,
  mockWaitForTransactionReceipt
} = vi.hoisted(() => ({
  mockSendTransaction: vi.fn(),
  mockAddSuccessToast: vi.fn(),
  mockAddErrorToast: vi.fn(),
  mockUseErc20Allowance: vi.fn(),
  mockExecuteApprove: vi.fn(),
  mockWriteContractAsync: vi.fn(),
  mockInvalidateQueries: vi.fn(),
  mockWaitForTransactionReceipt: vi.fn(),
  mockUseERC20Approve: vi.fn(() => ({
    executeWrite: mockExecuteApprove,
    receiptResult: { data: ref(null), error: ref(null) },
    writeResult: { data: ref(null), error: ref(null) }
  }))
}))

// Reactive refs for transaction states
const nativeReceipt = ref<{ status: string } | null>(null)
const isNativeDepositLoading = ref(false)
const isNativeDepositConfirmed = ref(false)
const transferHash = ref<string | undefined>(undefined)

// Mock Wagmi hooks
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@wagmi/vue')
  return {
    ...actual,
    useChainId: vi.fn(() => ref(1)),
    useWriteContract: vi.fn(() => ({
      data: transferHash,
      writeContractAsync: mockWriteContractAsync
    })),
    useWaitForTransactionReceipt: vi.fn(() => ({
      error: ref(null),
      isLoading: ref(false),
      isSuccess: ref(false)
    }))
  }
})

// Mock @wagmi/core
vi.mock('@wagmi/core', () => ({
  waitForTransactionReceipt: mockWaitForTransactionReceipt
}))

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

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@tanstack/vue-query')
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({
      invalidateQueries: mockInvalidateQueries
    }))
  }
})

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: () => ({
      addSuccessToast: mockAddSuccessToast,
      addErrorToast: mockAddErrorToast
    }),
    useUserDataStore: () => ({ address: '0xuseraddress0000000000000000000000000000' })
  }
})

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockUseContractBalance)
}))

import DepositSafeForm from '@/components/forms/DepositSafeForm.vue'

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
    vi.clearAllMocks()

    // Reset reactive states
    isNativeDepositLoading.value = false
    isNativeDepositConfirmed.value = false
    nativeReceipt.value = null
    transferHash.value = undefined

    // Default mock return values
    mockUseErc20Allowance.mockReturnValue({ data: ref(1000000n) })
    mockSendTransaction.mockResolvedValue({ hash: '0xnativetx' })
    mockExecuteApprove.mockResolvedValue(undefined)
    mockWriteContractAsync.mockResolvedValue('0xtransfertx')
    mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' })

    // Reset composable mocks
    mockUseERC20Approve.mockReturnValue({
      executeWrite: mockExecuteApprove,
      writeResult: { data: ref(null), error: ref(null) },
      receiptResult: { data: ref(null), error: ref(null) }
    })
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

      expect(mockSendTransaction).not.toHaveBeenCalled()
    })
  })

  describe('Native Token Deposit', () => {
    it('should show success toast and close modal after native deposit confirmation', async () => {
      mockSendTransaction.mockResolvedValueOnce({ hash: '0xnativetx' })
      const wrapper = createWrapper()

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

    it('should prevent multiple submissions while loading', async () => {
      isNativeDepositLoading.value = true
      const wrapper = createWrapper()

      await setTokenAmount(wrapper, '1', 'native', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockSendTransaction).not.toHaveBeenCalled()
    })
  })

  describe('ERC20 Token Deposit - With Sufficient Allowance', () => {
    it('should show success toast and close modal after ERC20 deposit', async () => {
      mockUseErc20Allowance.mockReturnValue({ data: ref(1000000n) })
      mockWriteContractAsync.mockResolvedValueOnce('0xtransfertx')
      transferHash.value = '0xtransfertx'

      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '100', 'usdc', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await flushPromises()

      expect(mockAddSuccessToast).toHaveBeenCalledWith(
        expect.stringContaining('deposited successfully')
      )
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })
  })

  describe('ERC20 Token Deposit - With Insufficient Allowance', () => {
    it('should handle approval errors gracefully', async () => {
      mockUseErc20Allowance.mockReturnValue({ data: ref(0n) })

      // Simulate approval error
      mockUseERC20Approve.mockReturnValue({
        executeWrite: mockExecuteApprove,
        writeResult: { data: ref(null), error: ref(new Error('Approval failed')) },
        receiptResult: { data: ref(null), error: ref(null) }
      })

      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '100', 'usdc', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await flushPromises()

      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to deposit usdc')
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
      mockUseErc20Allowance.mockReturnValue({ data: ref(0n) })

      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '100', 'usdc', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      // Should trigger approval flow
      expect(mockExecuteApprove).toHaveBeenCalled()
    })
  })
})

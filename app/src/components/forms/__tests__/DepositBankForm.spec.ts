import { mount, shallowMount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { ref, nextTick } from 'vue'
import { zeroAddress, type Address } from 'viem'
import { mockUseCurrencyStore } from '@/tests/mocks/index.mock'
import { mockUseContractBalance } from '@/tests/mocks/useContractBalance.mock'
import { WagmiPlugin, createConfig, http } from '@wagmi/vue'
import { mainnet } from 'viem/chains'

// Minimal wagmi config for test environment
const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

// Hoisted mocks for transaction handling
const {
  mockSendTransaction,
  mockWriteApprove,
  mockDepositToken,
  mockAddSuccessToast,
  mockAddErrorToast,
  mockUseErc20Allowance
} = vi.hoisted(() => ({
  mockSendTransaction: vi.fn(),
  mockWriteApprove: vi.fn(),
  mockDepositToken: vi.fn(),
  mockAddSuccessToast: vi.fn(),
  mockAddErrorToast: vi.fn(),
  mockUseErc20Allowance: vi.fn()
}))

const nativeReceipt = ref<{ status: string } | null>(null)
const tokenApprovalReceipt = ref<{ status: string } | null>(null)
const depositReceipt = ref<{ status: string } | null>(null)
const isNativeDepositLoading = ref(false)
const isNativeDepositConfirmed = ref(false)

// Mock composables
vi.mock('@/composables/transactions/useSafeSendTransaction', () => ({
  useSafeSendTransaction: vi.fn(() => ({
    sendTransaction: mockSendTransaction,
    isLoading: isNativeDepositLoading,
    isConfirmed: isNativeDepositConfirmed,
    receipt: nativeReceipt
  }))
}))

vi.mock('@/composables/erc20/index', () => ({
  useERC20Reads: vi.fn(() => ({
    useErc20Allowance: mockUseErc20Allowance
  })),
  useERC20WriteFunctions: vi.fn(() => ({
    writeApprove: mockWriteApprove,
    receipt: tokenApprovalReceipt
  }))
}))

vi.mock('@/composables/bank', () => ({
  useBankWritesFunctions: vi.fn(() => ({
    depositToken: mockDepositToken,
    receipt: depositReceipt
  }))
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

describe('DepositBankForm.vue', () => {
  const defaultProps = {
    loading: false,
    bankAddress: zeroAddress as Address
  }

  const createWrapper = (overrides = {}, mountFn = shallowMount) =>
    mountFn(DepositBankForm, {
      props: { ...defaultProps, ...overrides },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [WagmiPlugin, { config: wagmiConfig }]]
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
    tokenApprovalReceipt.value = null
    depositReceipt.value = null
    mockUseErc20Allowance.mockReturnValue({ data: ref(1000000n) })
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
    it('should approve token when allowance is insufficient', async () => {
      mockUseErc20Allowance.mockReturnValue({ data: ref(0n) })
      mockWriteApprove.mockResolvedValueOnce({})
      mockDepositToken.mockResolvedValueOnce({})

      const wrapper = createWrapper({}, mount)
      await setTokenAmount(wrapper, '1', 'usdc', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockWriteApprove).toHaveBeenCalled()
    })

    it('should skip approval when allowance is sufficient', async () => {
      mockUseErc20Allowance.mockReturnValue({ data: ref(1000000n) })
      mockDepositToken.mockResolvedValueOnce({})

      const wrapper = createWrapper({}, mount)
      await setTokenAmount(wrapper, '1', 'usdc', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockWriteApprove).not.toHaveBeenCalled()
      expect(mockDepositToken).toHaveBeenCalled()
    })

    it('should show error toast when selected token is not valid', async () => {
      mockUseErc20Allowance.mockReturnValue({ data: ref(0n) })

      const wrapper = createWrapper({}, mount)

      // Set an invalid token scenario by manually triggering with empty selection
      await setTokenAmount(wrapper, '100', 'invalid-token' as unknown as string, true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockAddErrorToast).toHaveBeenCalledWith('Selected token is not valid')
    })
  })
})

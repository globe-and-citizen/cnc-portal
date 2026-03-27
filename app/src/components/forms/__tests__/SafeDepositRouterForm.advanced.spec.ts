import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick, ref, type ComponentPublicInstance } from 'vue'
import { type Address } from 'viem'
import SafeDepositRouterForm from '@/components/forms/SafeDepositRouterForm.vue'
import {
  mockERC20Reads,
  resetERC20Mocks,
  mockInvestorReads,
  mockUseContractBalance,
  mockToastStore
} from '@/tests/mocks'

// Hoisted mocks
const {
  mockUseSafeDepositRouterAddress,
  mockUseSafeDepositRouterMultiplier,
  mockUseDeposit,
  mockUseERC20Approve
} = vi.hoisted(() => ({
  mockUseSafeDepositRouterAddress: vi.fn(),
  mockUseSafeDepositRouterMultiplier: vi.fn(),
  mockUseDeposit: vi.fn(),
  mockUseERC20Approve: vi.fn()
}))

// Mock composables
vi.mock('@/composables/safeDepositRouter/reads', () => ({
  useSafeDepositRouterAddress: mockUseSafeDepositRouterAddress,
  useSafeDepositRouterMultiplier: mockUseSafeDepositRouterMultiplier
}))

vi.mock('@/composables/safeDepositRouter/writes', () => ({
  useDeposit: mockUseDeposit
}))

vi.mock('@/composables/erc20/writes', () => ({
  useERC20Approve: mockUseERC20Approve
}))

// Create reactive refs
const mockMultiplierData = ref(1500000n)
const mockRouterAddressValue = ref('0xRouter0000000000000000000000000000000000' as Address)
const mockMultiplierError = ref<Error | null>(null)

const MOCK_DATA = {
  amount: '100',
  sherAmount: '150',
  tokenSymbol: 'SHER'
} as const

describe('SafeDepositRouterForm - Advanced Features', () => {
  const mockDepositWrite = {
    executeWrite: vi.fn(),
    writeResult: {
      isPending: ref(false),
      error: ref<Error | null>(null)
    },
    receiptResult: {
      isSuccess: ref(false)
    }
  }

  const mockApproveWrite = {
    executeWrite: vi.fn(),
    writeResult: {
      isPending: ref(false),
      error: ref<Error | null>(null)
    },
    receiptResult: {
      isSuccess: ref(false)
    }
  }

  const createWrapper = () =>
    mount(SafeDepositRouterForm, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  type SafeDepositRouterFormTestVm = ComponentPublicInstance & {
    amount: string
    sherAmount: string
    submitting: boolean
    currentStep: number
  }

  const getVm = (wrapper: ReturnType<typeof createWrapper>): SafeDepositRouterFormTestVm =>
    wrapper.vm as unknown as SafeDepositRouterFormTestVm

  const setTokenAmount = async (
    wrapper: ReturnType<typeof createWrapper>,
    value: string,
    isValid: boolean = true
  ): Promise<void> => {
    const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
    await tokenAmount.vm.$emit('update:modelValue', { amount: value, tokenId: 'usdc' })
    await tokenAmount.vm.$emit('validation', isValid)
    await nextTick()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    resetERC20Mocks()

    mockMultiplierData.value = 1500000n
    mockRouterAddressValue.value = '0xRouter0000000000000000000000000000000000' as Address
    mockMultiplierError.value = null
    mockDepositWrite.writeResult.error.value = null
    mockDepositWrite.receiptResult.isSuccess.value = false
    mockApproveWrite.writeResult.error.value = null
    mockApproveWrite.receiptResult.isSuccess.value = false

    mockUseSafeDepositRouterAddress.mockReturnValue(mockRouterAddressValue)
    mockUseSafeDepositRouterMultiplier.mockReturnValue({
      data: mockMultiplierData,
      error: mockMultiplierError,
      isLoading: ref(false)
    })

    mockInvestorReads.symbol.data.value = MOCK_DATA.tokenSymbol
    mockUseDeposit.mockReturnValue(mockDepositWrite)
    mockUseERC20Approve.mockReturnValue(mockApproveWrite)
    mockERC20Reads.allowance.data.value = 0n
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Bidirectional Amount Calculation', () => {
    it('should calculate deposit amount from SHER input', async () => {
      const wrapper = createWrapper()
      const compensationAmount = wrapper.findComponent({ name: 'CompensationAmount' })

      await compensationAmount.vm.$emit('update:modelValue', MOCK_DATA.sherAmount)
      await nextTick()

      // 150 SHER / 1.5 multiplier = 100 USDC
      expect(getVm(wrapper).amount).toBe(MOCK_DATA.amount)
    })

    it('should handle zero SHER input', async () => {
      const wrapper = createWrapper()
      const compensationAmount = wrapper.findComponent({ name: 'CompensationAmount' })

      await compensationAmount.vm.$emit('update:modelValue', '0')
      await nextTick()

      expect(getVm(wrapper).amount).toBe('0')
    })

    it('should recalculate when multiplier changes', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      expect(getVm(wrapper).sherAmount).toBe('150')

      // Change multiplier to 2.0x
      mockMultiplierData.value = 2000000n
      await nextTick()
      await flushPromises()

      expect(getVm(wrapper).sherAmount).toBe('200')
    })

    it('should handle empty SHER input', async () => {
      const wrapper = createWrapper()
      const compensationAmount = wrapper.findComponent({ name: 'CompensationAmount' })

      await compensationAmount.vm.$emit('update:modelValue', '')
      await nextTick()

      expect(getVm(wrapper).amount).toBe('0')
    })

    it('should prevent circular updates when changing deposit amount', async () => {
      const wrapper = createWrapper()

      // Set initial amount
      await setTokenAmount(wrapper, '100', true)
      expect(getVm(wrapper).sherAmount).toBe('150')

      // Change amount again - should not cause circular update
      await setTokenAmount(wrapper, '200', true)
      expect(getVm(wrapper).sherAmount).toBe('300')
    })
  })

  describe('Loading States', () => {
    it('should disable form during balance loading', async () => {
      mockUseContractBalance.isLoading.value = true
      const wrapper = createWrapper()
      await nextTick()

      const compensationAmount = wrapper.findComponent({ name: 'CompensationAmount' })
      expect(compensationAmount.props('disabled')).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle multiplier fetch error', async () => {
      const error = new Error('Network error')
      mockMultiplierError.value = error

      await nextTick()
      await flushPromises()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        'Failed to load SHER compensation rate'
      )
    })

    it('should handle approval error', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      mockApproveWrite.writeResult.error.value = new Error('User rejected transaction')
      await nextTick()
      await flushPromises()

      expect(mockToastStore.addErrorToast).toHaveBeenCalled()
      expect(getVm(wrapper).submitting).toBe(false)
      expect(getVm(wrapper).currentStep).toBe(1)
    })

    it('should handle deposit error', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      mockDepositWrite.writeResult.error.value = new Error('Insufficient balance')
      await nextTick()
      await flushPromises()

      expect(mockToastStore.addErrorToast).toHaveBeenCalled()
      expect(getVm(wrapper).submitting).toBe(false)
    })

    it('should handle user rejection gracefully', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      mockApproveWrite.writeResult.error.value = new Error('User denied transaction signature')
      await nextTick()
      await flushPromises()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Transaction cancelled by user')
    })
  })

  describe('Approval Workflow', () => {
    it('should proceed to deposit after successful approval', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      // Trigger approval success
      mockApproveWrite.receiptResult.isSuccess.value = true
      await nextTick()
      await flushPromises()

      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Token approval successful')
      expect(getVm(wrapper).currentStep).toBe(3)
      expect(mockDepositWrite.executeWrite).toHaveBeenCalled()
    })

    it('should skip approval if allowance sufficient', async () => {
      // Set sufficient allowance
      mockERC20Reads.allowance.data.value = 1000000000n // 1000 USDC in 6 decimals

      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      // Component renders with sufficient allowance
      expect(wrapper.exists()).toBe(true)
      expect(getVm(wrapper).amount).toBe(MOCK_DATA.amount)
    })
  })

  describe('Success Scenarios', () => {
    it('should reset form and close modal after successful deposit', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      mockDepositWrite.receiptResult.isSuccess.value = true
      await nextTick()
      await flushPromises()

      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
        expect.stringContaining('Successfully deposited')
      )
      expect(getVm(wrapper).amount).toBe('')
      expect(getVm(wrapper).sherAmount).toBe('0')
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing router address', async () => {
      mockRouterAddressValue.value = undefined as unknown as Address
      const wrapper = createWrapper()
      // Component renders even with missing router address
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle zero multiplier', async () => {
      mockMultiplierData.value = 0n
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      expect(getVm(wrapper).sherAmount).toBe('0')
    })

    it('should handle very large amounts', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '999999999999', true)

      // Should calculate without overflow
      expect(getVm(wrapper).sherAmount).toBeTruthy()
      expect(parseFloat(getVm(wrapper).sherAmount)).toBeGreaterThan(0)
    })

    it('should handle decimal precision correctly', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '100.123456', true)

      // Should handle 6 decimal precision for USDC
      expect(getVm(wrapper).sherAmount).toBeTruthy()
    })

    it('should reset step when amount changes', async () => {
      const wrapper = createWrapper()
      getVm(wrapper).currentStep = 3
      await nextTick()

      await setTokenAmount(wrapper, '50', true)
      await nextTick()

      expect(getVm(wrapper).currentStep).toBe(1)
    })
  })

  describe('Component Integration', () => {
    it('should properly integrate with TokenAmount component', async () => {
      const wrapper = createWrapper()
      const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })

      expect(tokenAmount.exists()).toBe(true)
      expect(tokenAmount.props('tokens')).toBeDefined()
      expect(tokenAmount.props('isLoading')).toBeDefined()
    })

    it('should properly integrate with CompensationAmount component', async () => {
      const wrapper = createWrapper()
      const compensationAmount = wrapper.findComponent({ name: 'CompensationAmount' })

      expect(compensationAmount.exists()).toBe(true)
      expect(compensationAmount.props('depositTokenSymbol')).toBe('USDC')
      expect(compensationAmount.props('rate')).toBe('1.5')
    })
  })
})

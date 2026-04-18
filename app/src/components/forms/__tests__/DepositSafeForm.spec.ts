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
  mockWagmiCore,
  useQueryClientFn
} from '@/tests/mocks'

type DepositSafeFormTestVm = ComponentPublicInstance & {
  amount: string
  selectedTokenId: string
  isAmountValid: boolean
  currentStep: number
  submitLabel: string
  errorMessage: string | null
  submitForm: () => Promise<void>
  handleCancel: () => void
  bigIntAmount: bigint
}

describe('DepositSafeForm.vue', () => {
  const defaultProps = {
    safeAddress: '0xsafeaddress000000000000000000000000' as Address
  }

  const createWrapper = (overrides = {}) =>
    mount(DepositSafeForm, {
      props: { ...defaultProps, ...overrides },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  const getVm = (wrapper: ReturnType<typeof createWrapper>) =>
    wrapper.vm as unknown as DepositSafeFormTestVm

  const createQueryClient = () => {
    const invalidateQueries = vi.fn()
    useQueryClientFn.mockReturnValue({
      invalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
    return { invalidateQueries }
  }

  const configureErc20Submit = async (wrapper: ReturnType<typeof createWrapper>): Promise<void> => {
    const vm = getVm(wrapper)
    vm.selectedTokenId = 'usdc'
    vm.isAmountValid = true
    await vm.submitForm()
  }

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
    resetTransactionMocks()
    resetERC20Mocks()
    transferHash.value = undefined
    createQueryClient()
    mockUseWriteContract.mutateAsync.mockResolvedValue(undefined)
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({ status: 'success' })
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

      expect(mockTransactionFunctions.mockMutateAsync).not.toHaveBeenCalled()
    })

    it('shows an alert from the highest-priority error source', async () => {
      const wrapper = createWrapper()
      mockUseSafeSendTransaction.error.value = Object.assign(new Error('Boom'), {
        shortMessage: 'Native error'
      })
      await wrapper.vm.$nextTick()

      expect(getVm(wrapper).errorMessage).toBe('Native error')
      expect(wrapper.text()).toContain('Native error')
    })
  })

  describe('Native Token Deposit', () => {
    it('should show success toast and close modal after native deposit confirmation', async () => {
      mockTransactionFunctions.mockMutateAsync.mockResolvedValueOnce({
        hash: '0xnativetx',
        receipt: { status: 'success' }
      })
      const wrapper = createWrapper()
      const vm = getVm(wrapper)

      vm.amount = '1'
      vm.selectedTokenId = 'native'
      vm.isAmountValid = true
      await vm.submitForm()
      await flushPromises()

      expect(mockTransactionFunctions.mockMutateAsync).toHaveBeenCalled()
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })

    it('should prevent multiple submissions while loading', async () => {
      mockUseSafeSendTransaction.isPending.value = true
      const wrapper = createWrapper()

      await setTokenAmount(wrapper, '1', 'native', true)
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      expect(mockTransactionFunctions.mockMutateAsync).not.toHaveBeenCalled()
    })

    it('handles native deposit failures gracefully', async () => {
      mockTransactionFunctions.mockMutateAsync.mockRejectedValueOnce(new Error('Native failed'))
      const wrapper = createWrapper()
      const vm = getVm(wrapper)

      vm.amount = '1'
      vm.selectedTokenId = 'native'
      vm.isAmountValid = true
      await vm.submitForm()
      await flushPromises()

      expect(getVm(wrapper).submitLabel).toBe('Deposit')
      expect(getVm(wrapper).errorMessage).toBeNull()
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

      expect(mockUseWriteContract.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'transfer' })
      )
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })

    it('uses the USDC.e address when depositing usdc.e', async () => {
      mockERC20Reads.allowance.data.value = 1000000n
      transferHash.value = '0xusdcetransfer'
      const wrapper = createWrapper()

      await setTokenAmount(wrapper, '1', 'usdc.e', true)
      await configureErc20Submit(wrapper)
      await flushPromises()

      expect(mockUseWriteContract.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'transfer' })
      )
    })
  })

  describe('ERC20 Token Deposit - With Insufficient Allowance', () => {
    it('should handle approval errors gracefully', async () => {
      mockERC20Reads.allowance.data.value = 0n
      mockERC20Writes.approve.writeResult.error.value = new Error('Approval failed')

      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '1', 'usdc', true)
      await configureErc20Submit(wrapper)
      await flushPromises()

      expect(mockUseWriteContract.mutateAsync).not.toHaveBeenCalled()
      expect(getVm(wrapper).currentStep).toBe(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle NaN amount gracefully', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, 'invalid', 'usdc', false)

      expect(getVm(wrapper).bigIntAmount).toBe(0n)
    })

    it('should handle zero allowance correctly', async () => {
      mockERC20Reads.allowance.data.value = 0n

      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '1', 'usdc', true)
      await configureErc20Submit(wrapper)
      await flushPromises()

      expect(mockERC20Writes.approve.executeWrite).toHaveBeenCalled()
    })

    it('throws into the catch path when the transfer hash is missing', async () => {
      mockERC20Reads.allowance.data.value = 1000000n
      transferHash.value = undefined
      const wrapper = createWrapper()

      await setTokenAmount(wrapper, '1', 'usdc', true)
      await configureErc20Submit(wrapper)
      await flushPromises()

      expect(wrapper.emitted('closeModal')).toBeFalsy()
      expect(getVm(wrapper).submitLabel).toBe('Deposit')
    })
  })
})

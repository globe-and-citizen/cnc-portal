import { shallowMount, mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

const mockUseSendTransaction = {
  sendTransactionAsync: vi.fn(),
  isPending: ref(false),
  data: ref<string | undefined>('0xtx'),
  isLoading: ref(false)
}
const mockUseWriteContract = {
  writeContractAsync: vi.fn(),
  isPending: ref(false),
  data: ref<string | undefined>('0xtx'),
  isLoading: ref(false)
}
const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false),
  data: ref({ status: 'success' }),
  status: ref('success')
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useSendTransaction: vi.fn(() => ({ ...mockUseSendTransaction })),
    useWriteContract: vi.fn(() => ({ ...mockUseWriteContract })),
    useWaitForTransactionReceipt: vi.fn(() => ({ ...mockUseWaitForTransactionReceipt }))
  }
})
vi.mock('@wagmi/core', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    readContract: vi.fn(() => Promise.resolve(1000000n)) // Mock readContract to return a large allowance
  }
})

const mocks = vi.hoisted(() => ({
  mockUseTeamStore: vi.fn(() => ({
    fetchTeam: vi.fn()
  })),
  mockUseCurrencyStore: vi.fn(() => mockUseCurrencyStore())
}))

// Move this mock to the top, before importing DepositBankForm
const addSuccessToast = vi.fn()
const addErrorToast = vi.fn()

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useCurrencyStore: mocks.mockUseCurrencyStore,
    useToastStore: () => ({ addSuccessToast, addErrorToast }),
    useUserDataStore: () => ({ address: zeroAddress })
  }
})

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockUseContractBalance)
}))

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useQueryClient: () => ({
      invalidateQueries: vi.fn()
    })
  }
})

import DepositBankForm from '@/components/forms/DepositBankForm.vue'

describe.skip('DepositBankForm.vue', () => {
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

  describe('rendering', () => {
    it('renders the form and TokenAmount', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Deposit to Team Bank Contract')
      expect(wrapper.findComponent({ name: 'TokenAmount' }).exists()).toBe(true)
    })
    it('passes tokens and loading to TokenAmount', () => {
      const wrapper = createWrapper()
      const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
      expect(tokenAmount.props('isLoading')).toBe(false)
      expect(Array.isArray(tokenAmount.props('tokens'))).toBe(true)
    })
  })

  describe('TokenAmount integration', () => {
    it('updates amount when TokenAmount emits update:modelValue', async () => {
      const wrapper = createWrapper()
      const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
      await tokenAmount.vm.$emit('update:modelValue', '42')
      await nextTick()
      expect(wrapper.find('.text-red-500').exists()).toBe(false)
    })
    it('updates selected token when TokenAmount emits update:modelToken', async () => {
      const wrapper = createWrapper()
      const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
      await tokenAmount.vm.$emit('update:modelToken', 'usdc')
      await nextTick()
      expect(wrapper.find('.text-red-500').exists()).toBe(false)
    })
  })

  describe('actions', () => {
    it('emits closeModal when cancel button is clicked', async () => {
      const wrapper = createWrapper()
      await wrapper.find('[data-test="cancel-button"]').trigger('click')
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })
    it('shows error toast if deposit fails', async () => {
      const wrapper = createWrapper({}, mount)
      const input = wrapper.find('input[data-test="amountInput"]')
      await input.setValue('1')
      mockUseSendTransaction.sendTransactionAsync.mockRejectedValueOnce('fail')
      await wrapper.find('.btn-primary').trigger('click')
    })
  })

  // Helper for emitting TokenAmount events
  async function setTokenAmount(
    wrapper: ReturnType<typeof createWrapper>,
    value: string,
    tokenId: string,
    isValid: boolean = true
  ): Promise<void> {
    const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
    await tokenAmount.vm.$emit('update:modelValue', value)
    await tokenAmount.vm.$emit('update:modelToken', tokenId)
    await tokenAmount.vm.$emit('validation', isValid)
    await nextTick()
  }

  describe('form submission', () => {
    let wrapper: ReturnType<typeof createWrapper>
    // let emits: (event: string) => unknown[] | undefined

    beforeEach(() => {
      vi.useFakeTimers()
      addSuccessToast.mockReset()
      addErrorToast.mockReset()
      wrapper = createWrapper({}, mount)
      mockUseSendTransaction.sendTransactionAsync.mockReset()
      mockUseWriteContract.writeContractAsync.mockReset()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('submits native token deposit successfully', async () => {
      mockUseSendTransaction.sendTransactionAsync.mockResolvedValueOnce({})
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await setTokenAmount(wrapper, '1', 'native')
      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      expect(mockUseSendTransaction.sendTransactionAsync).toHaveBeenCalled()
      // Simulate timer for waitForCondition
      await vi.runAllTimersAsync()
      await nextTick()
      expect(addSuccessToast).toHaveBeenCalled()
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })

    it('shows error toast if native token deposit fails', async () => {
      mockUseSendTransaction.sendTransactionAsync.mockRejectedValueOnce('fail')
      await setTokenAmount(wrapper, '1', 'native')
      await wrapper.find('.btn-primary').trigger('click')
      await vi.runAllTimersAsync()
      await nextTick()
      expect(addErrorToast).toHaveBeenCalled()
    })

    it('submits ERC20 deposit with approval needed', async () => {
      // Simulate insufficient allowance
      const readContract = vi.fn().mockResolvedValue(0)
      vi.doMock('@wagmi/core', () => ({ readContract }))
      mockUseWriteContract.writeContractAsync.mockResolvedValueOnce({}) // approve
      mockUseWriteContract.writeContractAsync.mockResolvedValueOnce({}) // deposit
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await setTokenAmount(wrapper, '1', 'usdc')
      await wrapper.find('.btn-primary').trigger('click')
      await vi.runAllTimersAsync()
      await nextTick()
      expect(mockUseWriteContract.writeContractAsync).toHaveBeenCalled()
      expect(addSuccessToast).toHaveBeenCalled()
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })

    it('submits ERC20 deposit with sufficient allowance', async () => {
      mockUseWriteContract.writeContractAsync.mockResolvedValueOnce({}) // deposit
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await setTokenAmount(wrapper, '1', 'usdc')
      await wrapper.find('.btn-primary').trigger('click')
      await vi.runAllTimersAsync()
      await nextTick()
      expect(mockUseWriteContract.writeContractAsync).toHaveBeenCalled()
      expect(addSuccessToast).toHaveBeenCalled()
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })

    it('shows error toast if ERC20 deposit fails', async () => {
      mockUseWriteContract.writeContractAsync.mockRejectedValueOnce('fail')
      await setTokenAmount(wrapper, '1', 'usdc')
      await wrapper.find('.btn-primary').trigger('click')
      await vi.runAllTimersAsync()
      await nextTick()
      expect(addErrorToast).toHaveBeenCalled()
    })

    it('does not submit if form is invalid', async () => {
      await setTokenAmount(wrapper, '1', 'native', false)
      await wrapper.find('.btn-primary').trigger('click')
      expect(mockUseSendTransaction.sendTransactionAsync).not.toHaveBeenCalled()
      expect(mockUseWriteContract.writeContractAsync).not.toHaveBeenCalled()
    })
  })
})

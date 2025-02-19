import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BankBalanceSection from '../BankBalanceSection.vue'
import type { Address } from 'viem'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { createConfig, http } from '@wagmi/core'
import { mainnet } from '@wagmi/core/chains'
import type * as wagmiVue from '@wagmi/vue'
import { useToastStore } from '@/stores/useToastStore'
import type { ComponentPublicInstance } from 'vue'

// Define the type for the component instance
interface BankBalanceSectionInstance extends ComponentPublicInstance {
  depositModal: boolean
  transferModal: boolean
  depositAmount: string
  loadingText: string
}

// Create a test wagmi config
const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

// Mock hooks
const mockUseBalance = {
  data: ref({ formatted: '1.5', value: BigInt(1500000) }),
  isLoading: ref(false),
  error: ref<Error | null>(null),
  refetch: vi.fn()
}

const mockUseReadContract = {
  data: ref(BigInt(1500000)),
  isLoading: ref(false),
  error: ref<Error | null>(null),
  refetch: vi.fn()
}

const mockUseSendTransaction = {
  isPending: ref(false),
  data: ref<string | undefined>('0xTransactionHash'),
  sendTransaction: vi.fn()
}

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref<Error | null>(null),
  isPending: ref(false),
  data: ref<string | undefined>(undefined)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false),
  data: ref({ status: 'success' })
}

// Mock the useConfig composable
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof wagmiVue
  return {
    ...actual,
    useConfig: () => config,
    useBalance: () => mockUseBalance,
    useReadContract: () => mockUseReadContract,
    useChainId: () => ref(1),
    useSendTransaction: () => mockUseSendTransaction,
    useWriteContract: () => mockUseWriteContract,
    useWaitForTransactionReceipt: () => mockUseWaitForTransactionReceipt
  }
})

describe('BankBalanceSection', () => {
  const defaultProps = {
    bankAddress: '0x123' as Address
  }

  const createWrapper = () => {
    return mount(BankBalanceSection, {
      props: defaultProps,
      global: {
        stubs: {
          ButtonUI: false,
          PlusIcon: true,
          ArrowsRightLeftIcon: true,
          ModalComponent: true
        },
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    }) as unknown as { vm: BankBalanceSectionInstance }
  }

  beforeEach(() => {
    // Reset mocks
    mockUseBalance.data.value = { formatted: '1.5', value: BigInt(1500000) }
    mockUseReadContract.data.value = BigInt(1500000)
    mockUseWriteContract.writeContract.mockReset()
    mockUseWriteContract.error.value = null
    mockUseWriteContract.isPending.value = false
    mockUseWriteContract.data.value = undefined
    mockUseSendTransaction.sendTransaction.mockReset()
    mockUseWaitForTransactionReceipt.isSuccess.value = false
    mockUseWaitForTransactionReceipt.isLoading.value = false
  })

  it('displays correct balance', () => {
    const wrapper = createWrapper()
    const balanceText = wrapper.vm.$el.querySelector('.text-4xl')?.textContent
    expect(balanceText).toContain('1.5')
    expect(wrapper.vm.$el.querySelector('.text-gray-600')?.textContent).toContain('USDC')
  })

  it('enables deposit button when bank address exists', () => {
    const wrapper = createWrapper()
    const depositButton = wrapper.vm.$el.querySelector('[data-test="deposit-button"]')
    expect(depositButton?.getAttribute('disabled')).toBeFalsy()
  })

  it('enables transfer button when bank address exists', () => {
    const wrapper = createWrapper()
    const transferButton = wrapper.vm.$el.querySelector('[data-test="transfer-button"]')
    expect(transferButton?.getAttribute('disabled')).toBeFalsy()
  })

  it('shows deposit modal on deposit button click', async () => {
    const wrapper = createWrapper()
    const depositButton = wrapper.vm.$el.querySelector('[data-test="deposit-button"]')
    await depositButton?.dispatchEvent(new Event('click'))
    expect(wrapper.vm.depositModal).toBe(true)
  })

  it('shows transfer modal on transfer button click', async () => {
    const wrapper = createWrapper()
    const transferButton = wrapper.vm.$el.querySelector('[data-test="transfer-button"]')
    await transferButton?.dispatchEvent(new Event('click'))
    expect(wrapper.vm.transferModal).toBe(true)
  })

  describe('Loading States', () => {
    it('shows correct loading text for ETH deposit', async () => {
      const wrapper = createWrapper()
      mockUseSendTransaction.isPending.value = true
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.loadingText).toBe('Depositing ETH...')
    })

    it('shows correct loading text for USDC approval', async () => {
      const wrapper = createWrapper()
      mockUseWriteContract.isPending.value = true
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.loadingText).toBe('Approving USDC...')
    })

    it('shows correct loading text for USDC deposit', async () => {
      const wrapper = createWrapper()
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.loadingText).toBe('Confirming USDC approval...')
    })
  })

  describe('Watch Handlers', () => {
    it('handles ETH deposit confirmation correctly', async () => {
      const wrapper = createWrapper()
      wrapper.vm.depositModal = true
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      const toastStore = useToastStore()
      expect(toastStore.addSuccessToast).toHaveBeenCalledWith('ETH deposited successfully')
      expect(wrapper.vm.depositModal).toBe(false)
    })

    it('handles transfer confirmation correctly', async () => {
      const wrapper = createWrapper()
      wrapper.vm.transferModal = true
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      const toastStore = useToastStore()
      expect(toastStore.addSuccessToast).toHaveBeenCalledWith('Transferred successfully')
      expect(wrapper.vm.transferModal).toBe(false)
    })

    it('handles USDC deposit confirmation correctly', async () => {
      const wrapper = createWrapper()
      wrapper.vm.depositModal = true
      wrapper.vm.depositAmount = '100'
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      const toastStore = useToastStore()
      expect(toastStore.addSuccessToast).toHaveBeenCalledWith('USDC deposited successfully')
      expect(wrapper.vm.depositModal).toBe(false)
      expect(wrapper.vm.depositAmount).toBe('')
    })

    it('handles token approval confirmation and triggers deposit', async () => {
      const wrapper = createWrapper()
      wrapper.vm.depositAmount = '100'
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      const toastStore = useToastStore()
      expect(toastStore.addSuccessToast).toHaveBeenCalledWith('Token approved successfully')
    })

    it('shows error toast when balance fetch fails', async () => {
      const wrapper = createWrapper()
      mockUseBalance.error.value = new Error('Failed to fetch balance')
      await wrapper.vm.$nextTick()

      const toastStore = useToastStore()
      expect(toastStore.addErrorToast).toHaveBeenCalledWith('Failed to fetch team balance')
    })
  })
})

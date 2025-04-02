import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import BankBalanceSection from '../BankBalanceSection.vue'
import type { Address } from 'viem'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { createConfig, http } from '@wagmi/core'
import { mainnet } from '@wagmi/core/chains'
import type * as wagmiVue from '@wagmi/vue'
import { useToastStore } from '@/stores/useToastStore'
import type { ComponentPublicInstance } from 'vue'
import { NETWORK, USDC_ADDRESS } from '@/constant'

// Create a test wagmi config
const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})
vi.mock('@/stores/useToastStore', () => ({
  useToastStore: vi.fn().mockReturnValue({
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  })
}))

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
    bankAddress: '0x123' as Address,
    priceData: {
      networkCurrencyPrice: 2000,
      usdcPrice: 1,
      loading: false,
      error: null
    }
  }

  const createWrapper = () => {
    interface BankBalanceSectionInstance extends ComponentPublicInstance {
      depositModal: boolean
      transferModal: boolean
      depositAmount: string
      loadingText: string
      totalValueUSD: string
      totalValueLocal: string
      formattedUsdcBalance: string
      depositToBank: (data: { amount: string; token: string }) => Promise<void>
      handleTransfer: (data: {
        address: { address: string }
        token: { symbol: string }
        amount: string
      }) => Promise<void>
    }
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
    }) as unknown as {
      vm: BankBalanceSectionInstance
      find: (selector: string) => VueWrapper
      findAll: (selector: string) => VueWrapper[]
      emitted: () => Record<string, unknown[]>
      setProps: (props: Partial<typeof defaultProps>) => Promise<void>
    }
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
    const balanceText = wrapper.find('.text-4xl')
    expect(balanceText.text()).toContain('1.5')
    expect(wrapper.find('.text-gray-600').text()).toContain('USD')
  })

  it('enables deposit button when bank address exists', () => {
    const wrapper = createWrapper()
    const depositButton = wrapper.find('[data-test="deposit-button"]')
    expect(depositButton.attributes('disabled')).toBeFalsy()
  })

  it('enables transfer button when bank address exists', () => {
    const wrapper = createWrapper()
    const transferButton = wrapper.find('[data-test="transfer-button"]')
    expect(transferButton.attributes('disabled')).toBeFalsy()
  })

  it('shows deposit modal on deposit button click', async () => {
    const wrapper = createWrapper()
    const depositButton = wrapper.find('[data-test="deposit-button"]')
    await depositButton.trigger('click')
    expect(wrapper.vm.depositModal).toBe(true)
  })

  it('shows transfer modal on transfer button click', async () => {
    const wrapper = createWrapper()
    const transferButton = wrapper.find('[data-test="transfer-button"]')
    await transferButton.trigger('click')
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

  describe('Computed Properties', () => {
    it('formats USDC balance correctly', async () => {
      const wrapper = createWrapper()
      mockUseReadContract.data.value = BigInt(1500000) // 1.5 USDC (1500000 / 1e6)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.formattedUsdcBalance).toBe('1.5')
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner when fetching balances', async () => {
      const wrapper = createWrapper()
      mockUseBalance.isLoading.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    })

    it('updates loading text during USDC deposit process', async () => {
      const wrapper = createWrapper()

      mockUseWriteContract.isPending.value = true
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.loadingText).toBe('Approving USDC...')

      mockUseWriteContract.isPending.value = false
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.loadingText).toBe('Confirming USDC approval...')
    })
  })

  describe('Transfer Modal Interactions', () => {
    it('opens transfer modal with correct initial state', async () => {
      const wrapper = createWrapper()
      const transferButton = wrapper.find('[data-test="transfer-button"]')

      await transferButton.trigger('click')

      expect(wrapper.vm.transferModal).toBe(true)
      const modal = wrapper.find('[data-test="transfer-modal"]')
      expect(modal.exists()).toBe(true)
    })
  })

  describe('Deposit Modal Interactions', () => {
    it('opens deposit modal with correct initial state', async () => {
      const wrapper = createWrapper()
      const depositButton = wrapper.find('[data-test="deposit-button"]')

      await depositButton.trigger('click')

      expect(wrapper.vm.depositModal).toBe(true)
      const modal = wrapper.find('[data-test="deposit-modal"]')
      expect(modal.exists()).toBe(true)
    })
  })

  describe('Transfer Functionality', () => {
    it('handles ETH transfer correctly', async () => {
      const wrapper = createWrapper()
      const transferData = {
        address: { address: '0x456' },
        token: { symbol: NETWORK.currencySymbol },
        amount: '1.0'
      }

      await wrapper.vm.handleTransfer(transferData)

      expect(mockUseWriteContract.writeContract).toHaveBeenCalledWith({
        address: defaultProps.bankAddress,
        abi: expect.any(Array),
        functionName: 'transfer',
        args: [transferData.address.address, expect.any(BigInt)]
      })
    })

    it('handles USDC transfer correctly', async () => {
      const wrapper = createWrapper()
      const transferData = {
        address: { address: '0x456' },
        token: { symbol: 'USDC' },
        amount: '100'
      }

      await wrapper.vm.handleTransfer(transferData)

      expect(mockUseWriteContract.writeContract).toHaveBeenCalledWith({
        address: defaultProps.bankAddress,
        abi: expect.any(Array),
        functionName: 'transferToken',
        args: [USDC_ADDRESS, transferData.address.address, expect.any(BigInt)]
      })
    })

    it('shows error toast when transfer fails', async () => {
      const wrapper = createWrapper()
      const transferData = {
        address: { address: '0x456' },
        token: { symbol: NETWORK.currencySymbol },
        amount: '1.0'
      }

      // Reset mock calls before the test
      mockUseWriteContract.writeContract.mockReset()
      mockUseWriteContract.writeContract.mockRejectedValueOnce(new Error('Transfer failed'))

      await wrapper.vm.handleTransfer(transferData)

      const toastStore = useToastStore()
      expect(toastStore.addErrorToast).toHaveBeenCalledWith('Failed to fetch team balance')
    })
  })

  describe('Balance Calculations', () => {
    it('calculates total USD value correctly', async () => {
      const wrapper = createWrapper()
      mockUseBalance.data.value = { formatted: '1.5', value: BigInt(1500000) }
      mockUseReadContract.data.value = BigInt(1000000) // 1 USDC

      await wrapper.vm.$nextTick()

      // 1.5 ETH * 2000 + 1 USDC * 1 = 3001 USD
      expect(wrapper.vm.totalValueUSD).toBe('3001.00')
    })

    it('calculates local currency value correctly', async () => {
      const wrapper = createWrapper()
      mockUseBalance.data.value = { formatted: '1.5', value: BigInt(1500000) }
      mockUseReadContract.data.value = BigInt(1000000) // 1 USDC

      await wrapper.vm.$nextTick()

      // (1.5 ETH * 2000 + 1 USDC * 1) * 1.28 = 3841.28 CAD
      expect(wrapper.vm.totalValueLocal).toBe('3841.28')
    })
  })

  describe('Error Handling', () => {
    it('handles USDC balance fetch error', async () => {
      const wrapper = createWrapper()
      mockUseReadContract.error.value = new Error('Failed to fetch USDC balance')
      await wrapper.vm.$nextTick()

      const toastStore = useToastStore()
      expect(toastStore.addErrorToast).toHaveBeenCalledWith('Failed to fetch team balance')
      expect(wrapper.emitted()).toBeTruthy()
    })

    it('handles missing bank address gracefully', async () => {
      const wrapper = createWrapper()
      // Reset mock calls before the test
      mockUseWriteContract.writeContract.mockReset()

      await wrapper.setProps({ bankAddress: undefined })

      await wrapper.vm.handleTransfer({
        address: { address: '0x456' },
        token: { symbol: NETWORK.currencySymbol },
        amount: '1.0'
      })

      expect(mockUseWriteContract.writeContract).not.toHaveBeenCalled()
    })
  })

  describe('Modal State Management', () => {
    it('closes deposit modal after successful deposit', async () => {
      const wrapper = createWrapper()
      wrapper.vm.depositModal = true
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.depositModal).toBe(false)
    })

    it('closes transfer modal after successful transfer', async () => {
      const wrapper = createWrapper()
      wrapper.vm.transferModal = true
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.transferModal).toBe(false)
    })
  })
})

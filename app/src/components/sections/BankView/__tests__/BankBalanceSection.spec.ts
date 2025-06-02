import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import BankBalanceSection from '../BankBalanceSection.vue'
import type { Address } from 'viem'
import { createTestingPinia } from '@pinia/testing'
import { ref, reactive } from 'vue'
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

vi.mock('@/stores/currencyStore', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@/stores/currencyStore')
  return {
    ...actual,
    useCurrencyStore: vi.fn(() => ({
      localCurrency: {
        code: 'USD',
        symbol: '$'
      },
      nativeToken: {
        priceInLocal: 2000,
        priceInUSD: 2000
      },
      usdc: {
        priceInLocal: 1,
        priceInUSD: 1
      }
    }))
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

// Mock values for useContractBalance
const mockBalances = reactive([
  {
    amount: 2.11,
    code: 'POL',
    valueInUSD: {
      value: 0.49,
      formated: '$0.49'
    },
    valueInLocalCurrency: {
      value: 0.44,
      formated: '€0.44'
    }
  },
  {
    amount: 0.01,
    code: 'USDC',
    valueInUSD: {
      value: 0.01,
      formated: '$0.01'
    },
    valueInLocalCurrency: {
      value: 0.01,
      formated: '€0.01'
    }
  }
])

const mockIsLoading = ref(false)
const mockError = ref<Error | null>(null)
const mockRefetch = vi.fn()

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: () => ({
    balances: mockBalances,
    isLoading: mockIsLoading,
    error: mockError,
    refetch: mockRefetch
  })
}))

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

describe.skip('BankBalanceSection', () => {
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
    expect(balanceText.text()).toContain('3001.00')
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

  describe('Watch Handlers', () => {
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
  })

  describe('Computed Properties', () => {
    it('formats USDC balance correctly', async () => {
      const wrapper = createWrapper()
      // Find the USDC balance in the array and update its amount
      const usdcBalance = mockBalances.find((b) => b.code === 'USDC')
      if (usdcBalance) {
        usdcBalance.amount = 1.5
        usdcBalance.valueInUSD = { value: 1.5, formated: '$1.50' }
        usdcBalance.valueInLocalCurrency = { value: 1.5, formated: '€1.50' }
      }
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.text-4xl').text()).toContain('3001.00')
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner when fetching balances', async () => {
      const wrapper = createWrapper()
      mockIsLoading.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
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
  })

  describe('Balance Calculations', () => {
    it('calculates local currency value correctly', async () => {
      const wrapper = createWrapper()
      const nativeToken = mockBalances.find((b) => b.code === 'POL')
      if (nativeToken) {
        nativeToken.amount = 1.5
        nativeToken.valueInUSD = { value: 3000, formated: '$3000.00' }
        nativeToken.valueInLocalCurrency = { value: 2700, formated: '€2700.00' }
      }
      const usdcToken = mockBalances.find((b) => b.code === 'USDC')
      if (usdcToken) {
        usdcToken.amount = 1.0
        usdcToken.valueInUSD = { value: 1.0, formated: '$1.00' }
        usdcToken.valueInLocalCurrency = { value: 1.0, formated: '€1.00' }
      }
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.text-gray-500').text()).toContain('3001.00 USD')
    })
  })

  describe('Error Handling', () => {
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

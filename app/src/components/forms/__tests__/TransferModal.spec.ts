import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import TransferModal from '../TransferModal.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TransferForm from '../TransferForm.vue'
import { Icon as IconifyIcon } from '@iconify/vue'

// Mock hoisted variables for Web3
const {
  mockWriteContract,
  mockUseChainId,
  mockUseReadContract,
  mockUseQueryClient,
  mockUseToastStore,
  mockUseUserDataStore,
  mockUseBodContract,
  mockUseContractBalance,
  mockWaitForTransactionReceipt: mockWaitForTransactionReceiptFn
} = vi.hoisted(() => ({
  mockWriteContract: vi.fn(),
  mockWaitForTransactionReceipt: vi.fn(),
  mockUseChainId: vi.fn(() => ref(1)),
  mockUseReadContract: vi.fn(),
  mockUseQueryClient: vi.fn(),
  mockUseToastStore: vi.fn(),
  mockUseUserDataStore: vi.fn(),
  mockUseBodContract: vi.fn(),
  mockUseContractBalance: vi.fn()
}))

// Mock wagmi
vi.mock('@wagmi/vue', () => ({
  useWriteContract: () => ({
    data: ref(null),
    isPending: ref(false),
    writeContractAsync: mockWriteContract
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: ref(false)
  }),
  useChainId: mockUseChainId,
  useReadContract: mockUseReadContract
}))

// Mock wagmi core
vi.mock('@wagmi/core', () => ({
  waitForTransactionReceipt: mockWaitForTransactionReceiptFn
}))

// Mock tanstack query
vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: mockUseQueryClient
}))

// Mock stores
vi.mock('@/stores', () => ({
  useToastStore: mockUseToastStore,
  useUserDataStore: mockUseUserDataStore
}))

// Mock composables
vi.mock('@/composables/bod/', () => ({
  useBodContract: mockUseBodContract
}))

vi.mock('@/composables', () => ({
  useContractBalance: mockUseContractBalance
}))

// Mock artifacts
vi.mock('@/artifacts/abi/bank', () => ({
  BANK_ABI: [
    {
      type: 'function',
      name: 'owner',
      outputs: [{ name: '', type: 'address' }]
    },
    {
      type: 'function',
      name: 'transfer',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ]
    },
    {
      type: 'function',
      name: 'transferToken',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ]
    }
  ]
}))

// Mock constant
vi.mock('@/constant', () => ({
  NETWORK: {
    currencySymbol: 'ETH'
  },
  USDC_ADDRESS: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
}))

// Mock config
vi.mock('@/wagmi.config', () => ({
  config: {}
}))

describe('TransferModal', () => {
  let wrapper: VueWrapper<any>

  // Mock test data
  const mockBankAddress = '0x1234567890123456789012345678901234567890' as const
  const mockUserAddress = '0x0987654321098765432109876543210987654321' as const
  const mockRecipientAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as const

  const mockBalance = [
    {
      token: { id: 'eth', symbol: 'ETH', name: 'Ethereum', code: 'ETH' },
      amount: 10,
      values: { USD: { price: 2000 } }
    },
    {
      token: { id: 'usdc', symbol: 'USDC', name: 'USD Coin', code: 'USDC' },
      amount: 5000,
      values: { USD: { price: 1 } }
    }
  ]

  // Test selectors
  const SELECTORS = {
    transferButton: '[data-test="transfer-button"]',
    transferModal: '[data-test="transfer-modal"]',
    tooltip: '[class*="tooltip"]',
    modalHeader: 'h1'
  } as const

  // Helper function to create component
  const mountComponent = (props = {}) => {
    mockUseReadContract.mockReturnValue({
      data: ref(mockUserAddress)
    })

    mockUseQueryClient.mockReturnValue({
      invalidateQueries: vi.fn()
    })

    mockUseToastStore.mockReturnValue({
      addErrorToast: vi.fn(),
      addSuccessToast: vi.fn()
    })

    mockUseUserDataStore.mockReturnValue({
      address: mockUserAddress
    })

    mockUseBodContract.mockReturnValue({
      useBodIsBodAction: vi.fn(() => ({
        isBodAction: ref(false)
      })),
      addAction: vi.fn(),
      isLoading: ref(false),
      isConfirming: ref(false),
      isActionAdded: ref(false)
    })

    mockUseContractBalance.mockReturnValue({
      balances: ref(mockBalance)
    })

    return mount(TransferModal, {
      props: {
        bankAddress: mockBankAddress,
        ...props
      },
      global: {
        components: {
          ButtonUI,
          ModalComponent,
          TransferForm,
          IconifyIcon
        },
        stubs: {
          TransferForm: true
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Modal Closing', () => {
    it('should reset transfer data when modal closes', async () => {
      wrapper = mountComponent()

      await wrapper.find(SELECTORS.transferButton).trigger('click')
      await nextTick()

      const modal = wrapper.findComponent(ModalComponent)
      await modal.vm.$emit('reset')
      await nextTick()

      expect(wrapper.find(SELECTORS.transferModal).exists()).toBe(false)
    })
  })

  describe('Transfer Handling - Direct Transfer', () => {
    it('should call token transfer for USDC', async () => {
      mockWriteContract.mockResolvedValue({ hash: '0xabcd1234' })
      mockWaitForTransactionReceiptFn.mockResolvedValue({ status: 'success' })

      wrapper = mountComponent()

      await wrapper.find(SELECTORS.transferButton).trigger('click')
      await nextTick()

      const form = wrapper.findComponent(TransferForm)
      await form.vm.$emit('transfer', {
        address: { address: mockRecipientAddress },
        token: { symbol: 'USDC' },
        amount: '100'
      })
      await nextTick()

      expect(mockWriteContract).toHaveBeenCalled()
    })

    it('should show success toast after successful transfer', async () => {
      const mockToastStore = {
        addErrorToast: vi.fn(),
        addSuccessToast: vi.fn()
      }
      mockUseToastStore.mockReturnValue(mockToastStore)

      mockWriteContract.mockResolvedValue({ hash: '0xabcd1234' })
      mockWaitForTransactionReceiptFn.mockResolvedValue({ status: 'success' })

      wrapper = mountComponent()

      await wrapper.find(SELECTORS.transferButton).trigger('click')
      await nextTick()

      const form = wrapper.findComponent(TransferForm)
      await form.vm.$emit('transfer', {
        address: { address: mockRecipientAddress },
        token: { symbol: 'ETH' },
        amount: '1.5'
      })
      await nextTick()
    })
  })
})

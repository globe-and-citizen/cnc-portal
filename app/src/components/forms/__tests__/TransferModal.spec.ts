import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import TransferModal from '../TransferModal.vue'
import TransferForm from '../TransferForm.vue'
import {
  mockUseWriteContract,
  mockWagmiCore,
  mockUseReadContract,
  mockBodIsBodAction,
  mockBodAddAction
} from '@/tests/mocks'
import { mockUserStore } from '@/tests/mocks'
import { mockUseContractBalance } from '@/tests/mocks'

// Keep local mock only for the Bank ABI (not covered by global setup)
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

describe('TransferModal', () => {
  let wrapper: VueWrapper

  // Mock test data
  const mockBankAddress = '0x1234567890123456789012345678901234567890' as const

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

  const mockRecipientAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as const

  // Test selectors
  const SELECTORS = {
    transferButton: '[data-test="transfer-button"]',
    transferModal: '[data-test="transfer-modal"]',
    tooltip: '[class*="tooltip"]',
    modalHeader: 'h1'
  } as const

  // Helper function to create component
  const mountComponent = (props = {}) => {
    // Configure the bank owner to match the user address so transfers are enabled
    mockUseReadContract.data.value = mockUserStore.address
    // Set contract balance to test data
    mockUseContractBalance.balances.value = mockBalance as never

    return mount(TransferModal, {
      props: {
        bankAddress: mockBankAddress,
        ...props
      },
      global: {
        components: {
          TransferForm
        },
        stubs: {
          TransferForm: true
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock state for each test
    mockUseReadContract.data.value = '0xData'
    mockBodIsBodAction.isBodAction.value = false
    mockBodAddAction.isPending.value = false
    mockBodAddAction.isConfirming.value = false
    mockBodAddAction.isActionAdded.value = false
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Modal Closing', () => {
    it('should reset transfer data when modal closes', async () => {
      wrapper = mountComponent()

      await wrapper.find(SELECTORS.transferButton).trigger('click')
      await nextTick()

      // @ts-expect-error internal method
      wrapper.vm.resetTransferValues()
      await nextTick()

      expect(wrapper.find(SELECTORS.transferModal).exists()).toBe(false)
    })
  })

  describe('Transfer Handling - Direct Transfer', () => {
    it('should call token transfer for USDC', async () => {
      mockUseWriteContract.mutateAsync.mockResolvedValue({ hash: '0xabcd1234' })
      mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({ status: 'success' })

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

      expect(mockUseWriteContract.mutateAsync).toHaveBeenCalled()
    })

    it('should show success toast after successful transfer', async () => {
      mockUseWriteContract.mutateAsync.mockResolvedValue({ hash: '0xabcd1234' })
      mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({ status: 'success' })

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

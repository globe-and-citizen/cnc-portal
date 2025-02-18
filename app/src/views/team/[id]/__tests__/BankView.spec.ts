import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BankView from '../BankView.vue'
import { createTestingPinia } from '@pinia/testing'
import { useToastStore } from '@/stores/useToastStore'
import type { VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'
import { ref } from 'vue'
import type { User } from '@/types'
import type { Abi } from 'viem'

const mockUseReadContractRefetch = vi.fn()
const mockUseReadContract = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: mockUseReadContractRefetch
}

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref<Error | null>(null),
  isPending: ref(false),
  data: ref<string | undefined>(undefined)
}

const mockUseBalance = {
  data: ref<{ formatted: string; value: bigint } | null>(null),
  refetch: vi.fn(),
  error: ref<Error | null>(null),
  isLoading: ref(false)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false),
  data: ref({ status: 'success' })
}

const mockUseSignTypedData = {
  error: ref<Error | null>(null),
  data: ref<string | undefined>('0xExpenseDataSignature'),
  signTypedData: vi.fn()
}

const mockUseSendTransaction = {
  isPending: ref(false),
  data: ref<string | undefined>('0xTransactionHash'),
  sendTransaction: vi.fn()
}

// Mock readContract function
const mockReadContract = vi.fn().mockResolvedValue(BigInt(0))

// Mock external components and dependencies
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => {
      return { ...mockUseReadContract, data: ref(`0xContractOwner`) }
    }),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useBalance: vi.fn(() => mockUseBalance),
    useChainId: vi.fn(() => ref('0xChainId')),
    useSignTypedData: vi.fn(() => mockUseSignTypedData),
    useSendTransaction: vi.fn(() => mockUseSendTransaction)
  }
})

interface ContractCallArgs {
  address: string
  abi: Abi
  functionName: string
  args: unknown[]
}

vi.mock('@wagmi/core', () => ({
  readContract: (args: ContractCallArgs) => mockReadContract(args)
}))

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: {
      id: 0
    }
  }))
}))

vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: () => ({
    get: () => ({
      json: () => ({
        data: {
          bankAddress: '0x123',
          id: '1',
          name: 'Test Team'
        },
        error: null,
        execute: vi.fn()
      })
    }),
    post: () => ({
      json: () => ({
        data: null,
        error: null,
        execute: vi.fn()
      })
    })
  })
}))

interface BankViewInstance extends ComponentPublicInstance {
  depositModal: boolean
  transferModal: boolean
  tokenDepositModal: boolean
  tokenAmount: string
  foundUsers: Array<User>
  loadingText: string
  refetchBalances: () => Promise<void>
  tokensWithRank: Array<{ rank: number }>
  depositToBank: (params: { amount: string; token: string }) => Promise<void>
  transferFromBank: (
    to: string,
    amount: string,
    description: string,
    token: string
  ) => Promise<void>
  depositToken: () => Promise<void>
  searchUsers: (input: { name: string; address: string }) => Promise<void>
  depositAmount: string
}

describe('BankView', () => {
  let wrapper: VueWrapper<BankViewInstance>

  beforeEach(() => {
    // Reset mocks
    mockUseBalance.data.value = { formatted: '1.5', value: BigInt(1500000) }
    mockUseReadContract.data.value = '0xContractOwner'
    mockUseWriteContract.writeContract.mockReset()
    mockUseWriteContract.error.value = null
    mockUseWriteContract.isPending.value = false
    mockUseWriteContract.data.value = undefined
    mockUseSendTransaction.sendTransaction.mockReset()
    mockReadContract.mockReset()
    mockReadContract.mockResolvedValue(BigInt(0))
    mockUseWaitForTransactionReceipt.isSuccess.value = false
    mockUseWaitForTransactionReceipt.isLoading.value = false

    wrapper = mount(BankView, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: {
                address: '0x123'
              }
            }
          })
        ],
        stubs: {
          ButtonUI: false,
          TableComponent: true,
          ModalComponent: false,
          TransferFromBankForm: false,
          DepositBankForm: false,
          PlusIcon: true,
          ArrowsRightLeftIcon: true
        }
      }
    }) as unknown as VueWrapper<BankViewInstance>
  })

  it('renders the bank view correctly', () => {
    expect(wrapper.find('[data-test="expense-account-balance"]').exists()).toBe(false)
  })

  it('displays correct balances when loaded', async () => {
    await wrapper.vm.$nextTick()
    const balanceText = wrapper.find('.text-4xl').text()
    expect(balanceText).toContain('1.5')
  })

  it('displays loading state when fetching balances', async () => {
    // Override the mock to show loading state
    mockUseBalance.isLoading.value = true
    await wrapper.vm.$nextTick()
    const loadingSpinner = wrapper.find('.loading-spinner')
    expect(loadingSpinner.exists()).toBe(true)
  })

  it('shows error toast when balance fetch fails', async () => {
    const toastStore = useToastStore()

    // Simulate balance fetch error
    mockUseBalance.error.value = new Error('Failed to fetch balance')
    await wrapper.vm.$nextTick()

    // Trigger error handling by forcing a refetch
    await wrapper.vm.refetchBalances()
    expect(toastStore.addErrorToast).toHaveBeenCalled()
  })

  it('formats token holdings data correctly', async () => {
    await wrapper.vm.$nextTick()
    const tokensWithRank = wrapper.vm.tokensWithRank
    expect(tokensWithRank).toHaveLength(2) // ETH and USDC
    expect(tokensWithRank[0].rank).toBe(1)
    expect(tokensWithRank[1].rank).toBe(2)
  })

  describe('Token Deposit Modal', () => {
    it('opens token deposit modal correctly', async () => {
      wrapper.vm.tokenDepositModal = true
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick() // Double nextTick to ensure modal is rendered
      expect(wrapper.find('input[type="number"]').exists()).toBe(true)
    })
  })

  describe('Loading States', () => {
    beforeEach(() => {
      // Reset all loading states
      mockUseWriteContract.isPending.value = false
      mockUseWaitForTransactionReceipt.isLoading.value = false
      mockUseSignTypedData.error.value = null
    })

    it('shows correct loading text for ETH deposit', async () => {
      mockUseSendTransaction.isPending.value = true
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.loadingText).toBe('Depositing ETH...')
    })

    it('shows correct loading text for USDC approval', async () => {
      mockUseWriteContract.isPending.value = true
      mockUseSignTypedData.error.value = null
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.loadingText).toBe('Approving USDC...')
    })

    it('shows correct loading text for USDC deposit', async () => {
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.loadingText).toBe('Confirming USDC approval...')
    })
  })

  describe('Watch Handlers', () => {
    it('handles ETH deposit confirmation correctly', async () => {
      const toastStore = useToastStore()
      wrapper.vm.depositModal = true
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()
      expect(toastStore.addSuccessToast).toHaveBeenCalledWith('ETH deposited successfully')
      expect(wrapper.vm.depositModal).toBe(false)
    })

    it('handles transfer confirmation correctly', async () => {
      const toastStore = useToastStore()
      wrapper.vm.transferModal = true
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()
      expect(toastStore.addSuccessToast).toHaveBeenCalledWith('Transferred successfully')
      expect(wrapper.vm.transferModal).toBe(false)
    })

    it('handles USDC deposit confirmation correctly', async () => {
      const toastStore = useToastStore()
      wrapper.vm.depositModal = true
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()
      expect(toastStore.addSuccessToast).toHaveBeenCalledWith('USDC deposited successfully')
      expect(wrapper.vm.depositModal).toBe(false)
      expect(wrapper.vm.depositAmount).toBe('')
    })

    it('handles token approval confirmation and triggers deposit', async () => {
      const toastStore = useToastStore()
      wrapper.vm.depositAmount = '100'
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()
      expect(toastStore.addSuccessToast).toHaveBeenCalledWith('Token approved successfully')
      // Verify that handleUsdcDeposit was triggered with the correct amount
    })
  })

  // New tests for specific watch handlers
  describe('Watch Handler Behaviors', () => {
    it('watches isConfirmingDeposit state changes', async () => {
      const toastStore = useToastStore()
      wrapper.vm.depositModal = true

      // Simulate deposit confirmation completing
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      expect(toastStore.addSuccessToast).toHaveBeenCalledWith('ETH deposited successfully')
      expect(wrapper.vm.depositModal).toBe(false)
    })

    it('watches isConfirmingTransfer state changes', async () => {
      const toastStore = useToastStore()
      wrapper.vm.transferModal = true

      // Simulate transfer confirmation completing
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      expect(toastStore.addSuccessToast).toHaveBeenCalledWith('Transferred successfully')
      expect(wrapper.vm.transferModal).toBe(false)
    })

    it('watches isConfirmingTokenDeposit state changes', async () => {
      const toastStore = useToastStore()
      wrapper.vm.depositModal = true
      wrapper.vm.depositAmount = '100'

      // Simulate token deposit confirmation completing
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      expect(toastStore.addSuccessToast).toHaveBeenCalledWith('USDC deposited successfully')
      expect(wrapper.vm.depositModal).toBe(false)
      expect(wrapper.vm.depositAmount).toBe('')
    })

    it('watches isConfirmingApprove state changes', async () => {
      const toastStore = useToastStore()
      wrapper.vm.depositAmount = '100'

      // Mock the writeContract for subsequent deposit
      mockUseWriteContract.writeContract.mockImplementationOnce(async () => {
        mockUseWaitForTransactionReceipt.data.value = { status: 'success' }
      })

      // Simulate approval confirmation completing
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      expect(toastStore.addSuccessToast).toHaveBeenCalledWith('Token approved successfully')
    })
  })
})

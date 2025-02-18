import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BankView from '../BankView.vue'
import { createTestingPinia } from '@pinia/testing'
import { useToastStore } from '@/stores/useToastStore'
import type { VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'
import { ref } from 'vue'

const mockUseReadContractRefetch = vi.fn()
const mockUseReadContract = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: mockUseReadContractRefetch //vi.fn()
}

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}

const mockUseBalance = {
  data: ref<{ formatted: string; value: bigint } | null>(null),
  refetch: vi.fn(),
  error: ref<Error | null>(null),
  isLoading: ref(false)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
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
  refetchBalances: () => Promise<void>
  tokensWithRank: Array<{ rank: number }>
  depositToBank: (params: { amount: string; token: string }) => Promise<void>
  transferFromBank: (
    to: string,
    amount: string,
    description: string,
    token: string
  ) => Promise<void>
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
    mockUseWriteContract.data.value = null

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
          ButtonUI: false, // Change to false to test button interactions
          TableComponent: true,
          ModalComponent: true,
          TransferFromBankForm: true,
          DepositBankForm: true,
          PlusIcon: true,
          ArrowsRightLeftIcon: true
        }
      }
    }) as VueWrapper<BankViewInstance>
  })

  it('renders the bank view correctly', () => {
    expect(wrapper.find('.min-h-screen').exists()).toBe(true)
    expect(wrapper.find('[data-test="expense-account-balance"]').exists()).toBe(false)
  })

  it('displays correct balances when loaded', async () => {
    await wrapper.vm.$nextTick()
    const balanceText = wrapper.find('.text-4xl').text()
    expect(balanceText).toContain('1.5')
  })

  it('enables deposit button when bank address exists', async () => {
    const depositButton = wrapper.find('[data-test="deposit-button"]')
    expect(depositButton.attributes('disabled')).toBeFalsy()
  })

  it('enables transfer button when bank address exists', async () => {
    const transferButton = wrapper.find('[data-test="transfer-button"]')
    expect(transferButton.attributes('disabled')).toBeFalsy()
  })

  it('opens deposit modal on deposit button click', async () => {
    const depositButton = wrapper.find('[data-test="deposit-button"]')
    await depositButton.trigger('click')
    expect(wrapper.vm.depositModal).toBe(true)
  })

  it('opens transfer modal on transfer button click', async () => {
    const transferButton = wrapper.find('[data-test="transfer-button"]')
    await transferButton.trigger('click')
    expect(wrapper.vm.transferModal).toBe(true)
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
})

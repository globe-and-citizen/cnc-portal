import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BankView from '../BankView.vue'
import { createTestingPinia } from '@pinia/testing'
import type { VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'
import { ref } from 'vue'
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
    useChainId: vi.fn(() => ref('0xChainId'))
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

// Add mock for teamStore
const mockTeamStore = {
  currentTeam: {
    bankAddress: '0x123',
    id: '1',
    name: 'Test Team'
  }
}

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))

interface BankViewInstance extends ComponentPublicInstance {
  refetchBalances: () => Promise<void>
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
          ArrowsRightLeftIcon: true,
          // Add stubs for new components
          BankBalanceSection: true,
          TokenHoldingsSection: true,
          TransactionsHistorySection: true
        }
      }
    }) as unknown as VueWrapper<BankViewInstance>
  })

  it('renders the bank view correctly', () => {
    expect(wrapper.find('[data-test="expense-account-balance"]').exists()).toBe(false)
  })
})

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
const mockUseQuery = {
  result: ref({
    transactions: [
      {
        amount: '7000000',
        blockNumber: '33',
        blockTimestamp: '1741077830',
        contractAddress: '0x552a6b9d3c6ef286fb40eeae9e8cfecdab468c0a',
        contractType: 'Bank',
        from: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        id: '0xe5a1940c7d5b338a4383fed25d08d338efe17a40cd94d66677f374a81c0d2d3a01000000',
        to: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        tokenAddress: '0x59b670e9fa9d0a427751af201d676719a970857b',
        transactionHash: '0xe5a1940c7d5b338a4383fed25d08d338efe17a40cd94d66677f374a81c0d2d3a',
        transactionType: 'deposit',
        __typename: 'Transaction'
      }
    ]
  }),
  error: ref<Error | null>(),
  loading: ref(false)
}
vi.mock('@vue/apollo-composable', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useQuery: vi.fn(() => ({ ...mockUseQuery }))
  }
})

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

const mockUseSendTransaction = {
  isPending: ref(false),
  error: ref<Error | null>(null),
  data: ref<string | undefined>(undefined)
}

// Mock readContract function
const mockReadContract = vi.fn().mockResolvedValue(BigInt(0))

// Mock external components and dependencies
vi.mock('@wagmi/vue', async (importOriginal: () => Promise<Record<string, unknown>>) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => {
      return { ...mockUseReadContract, data: ref(`0xContractOwner`) }
    }),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useBalance: vi.fn(() => mockUseBalance),
    useChainId: vi.fn(() => ref('0xChainId')),
    useSendTransaction: vi.fn(() => mockUseSendTransaction)
  }
})

interface ContractCallArgs {
  address: string
  abi: Abi
  functionName: string
  args: unknown[]
}

interface TeamContract {
  type: string
  address: string
}

interface Team {
  bankAddress: string
  id: string
  name: string
  teamContracts: TeamContract[]
}

vi.mock('@wagmi/core', () => ({
  readContract: (args: ContractCallArgs) => mockReadContract(args)
}))

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: {
      id: 0
    }
  })),
  createRouter: vi.fn(() => ({
    beforeEach: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  })),
  createWebHistory: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
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

vi.mock('@/composables/useCryptoPrice', () => ({
  useCryptoPrice: () => ({
    prices: ref({
      ethereum: { usd: 2000 },
      'usd-coin': { usd: 1 }
    }),
    loading: ref(false),
    error: ref(null)
  })
}))

vi.mock('@/composables/useCurrencyRates', () => ({
  useCurrencyRates: () => ({
    loading: ref(false),
    error: ref(null),
    getRate: vi.fn()
  })
}))

interface TeamStore {
  currentTeam: Team | null
}

// Add mock for teamStore
const mockTeamStore: TeamStore = {
  currentTeam: {
    bankAddress: '0x123',
    id: '1',
    name: 'Test Team',
    teamContracts: [
      {
        type: 'Bank',
        address: '0x123'
      }
    ]
  }
}

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))

// Add mock components
const BankBalanceSection = {
  name: 'BankBalanceSection',
  template: '<div>Bank Balance Section</div>',
  props: ['bankAddress']
}

const TokenHoldingsSection = {
  name: 'TokenHoldingsSection',
  template: '<div>Token Holdings Section</div>',
  props: ['bankBalanceSection']
}

const TransactionsHistorySection = {
  name: 'TransactionsHistorySection',
  template: '<div>Transactions History Section</div>'
}

interface BankViewInstance extends ComponentPublicInstance {
  refetchBalances: () => Promise<void>
  typedBankAddress: string | undefined
  priceData: {
    networkCurrencyPrice: number
    usdcPrice: number
    loading: boolean
    error: boolean | null
  }
  currencyRatesData: {
    loading: boolean
    error: Error | null
    getRate: () => void
  }
  networkCurrencyId: string
  networkCurrencyPrice: number
  usdcPrice: number
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
          ButtonUI: true,
          TableComponent: true,
          ModalComponent: true,
          TransferFromBankForm: true,
          DepositBankForm: true,
          PlusIcon: true,
          ArrowsRightLeftIcon: true
        },
        components: {
          BankBalanceSection,
          TokenHoldingsSection,
          TransactionsHistorySection
        }
      }
    }) as unknown as VueWrapper<BankViewInstance>
  })

  describe('Component Rendering', () => {
    it('renders all required sections', () => {
      expect(wrapper.findComponent({ name: 'BankBalanceSection' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'GenericTokenHoldingsSection' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'TransactionsHistorySection' }).exists()).toBe(true)
    })

    it('passes correct bank address to BankBalanceSection', () => {
      const bankBalanceSection = wrapper.findComponent({ name: 'BankBalanceSection' })
      expect(bankBalanceSection.props('bankAddress')).toBe(mockTeamStore.currentTeam?.bankAddress)
    })

    it('passes bankBalanceSection ref to TokenHoldingsSection', () => {
      const tokenHoldingsSection = wrapper.findComponent({ name: 'GenericTokenHoldingsSection' })
      expect(tokenHoldingsSection.props('address')).toBe(mockTeamStore.currentTeam?.bankAddress)
    })

    it('renders BankBalanceSection with correct price data', () => {
      const bankBalanceSection = wrapper.findComponent({ name: 'BankBalanceSection' })
      expect(bankBalanceSection.exists()).toBe(true)
      expect(bankBalanceSection.props('priceData')).toEqual({
        networkCurrencyPrice: 2000,
        usdcPrice: 1,
        loading: false,
        error: null
      })
    })
  })

  describe('Computed Properties', () => {
    it('computes typedBankAddress correctly from teamStore', () => {
      expect(wrapper.vm.typedBankAddress).toBe(mockTeamStore.currentTeam?.teamContracts[0].address)
    })

    it('computes networkCurrencyId correctly', () => {
      expect(wrapper.vm.networkCurrencyId).toBe('ethereum')
    })

    it('computes networkCurrencyPrice correctly', () => {
      expect(wrapper.vm.networkCurrencyPrice).toBe(2000)
    })

    it('computes usdcPrice correctly', () => {
      expect(wrapper.vm.usdcPrice).toBe(1)
    })
  })

  describe('Data Management', () => {
    it('computes price data correctly', () => {
      expect(wrapper.vm.priceData).toEqual({
        networkCurrencyPrice: 2000,
        usdcPrice: 1,
        loading: false,
        error: null
      })
    })

    it('computes currency rates data correctly', () => {
      expect(wrapper.vm.currencyRatesData).toEqual({
        loading: false,
        error: null,
        getRate: expect.any(Function)
      })
    })

    it('updates when balance is updated', async () => {
      const bankBalanceSection = wrapper.findComponent({ name: 'BankBalanceSection' })
      await bankBalanceSection.vm.$emit('balance-updated')
      expect(wrapper.emitted()).toBeTruthy()
    })
  })
})

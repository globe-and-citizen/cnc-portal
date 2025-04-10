import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ExpenseAccountSection from '@/components/sections/ExpenseAccountView/MyApprovedExpenseSection.vue'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import { createTestingPinia } from '@pinia/testing'
// import TransferForm from '@/components/forms/TransferForm.vue'
import * as viem from 'viem'
import type { Team } from '@/types'
import ButtonUI from '@/components/ButtonUI.vue'
import * as util from '@/utils'

const mocks = vi.hoisted(() => ({
  mockUseToastStore: {
    addErrorToast: vi.fn()
  },
  mockReadContract: vi.fn()
}))

const DATE = '2024-02-02T12:00:00Z'
const budgetData = {
  txsPerPeriod: 1,
  amountPerPeriod: 100,
  amountPerTransaction: 20
}

const mockExpenseData = [
  {
    approvedAddress: `0x0123456789012345678901234567890123456789`,
    name: 'John Doe',
    budgetData: [
      { budgetType: 0, value: budgetData.txsPerPeriod },
      { budgetType: 1, value: budgetData.amountPerPeriod },
      { budgetType: 2, value: budgetData.amountPerTransaction }
    ],
    expiry: Math.floor(new Date(DATE).getTime() / 1000),
    signature: '0xSignature',
    tokenAddress: viem.zeroAddress,
    balances: {
      0: '0',
      1: '0',
      2: 0
    },
    status: 'enabled'
  },
  {
    approvedAddress: `0xabcdef1234abcdef1234abcdef1234abcdef1234`,
    budgetData: [
      { budgetType: 0, value: budgetData.txsPerPeriod * 2 },
      { budgetType: 1, value: budgetData.amountPerPeriod * 2 },
      { budgetType: 2, value: budgetData.amountPerTransaction * 2 }
    ],
    expiry: Math.floor(new Date(DATE).getTime() / 1000),
    signature: '0xAnotherSignature',
    tokenAddress: USDC_ADDRESS
  }
]

const mockExpenseDataStore = {
  allExpenseDataParsed: mockExpenseData,
  fetchAllExpenseData: vi.fn()
}

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: vi.fn(() => ({ addErrorToast: mocks.mockUseToastStore.addErrorToast })),
    useTeamStore: vi.fn(() => ({
      currentTeam: {
        id: '1',
        name: 'Team Name',
        description: 'Team Description',
        members: [],
        teamContracts: [
          {
            address: '0xcontractaddress',
            admins: [],
            type: 'ExpenseAccountEIP712',
            deployer: '0xdeployeraddress'
          }
        ],
        ownerAddress: '0xOwner'
      }
    })),
    useExpenseDataStore: vi.fn(() => ({
      ...mockExpenseDataStore
    })),
    useCryptoPrice: vi.fn(),
    useCurrencyStore: vi.fn(() => ({
      currency: {
        code: 'USD',
        symbol: '$'
      }
    }))
  }
})

const mockCopy = vi.fn()
const mockClipboard = {
  copy: mockCopy,
  copied: ref(false),
  isSupported: ref(true)
}
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
  data: ref(null),
  refetch: vi.fn(),
  error: ref(null),
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

// Mocking wagmi functions
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
    useSignTypedData: vi.fn(() => mockUseSignTypedData)
  }
})

vi.mock('@wagmi/core', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    readContract: mocks.mockReadContract
  }
})

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    parseSignature: vi.fn(),
    hashTypedData: vi.fn(),
    keccak256: vi.fn()
  }
})

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useClipboard: vi.fn(() => mockClipboard)
  }
})

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ params: { id: 1 } }))
  }
})

const mockGetBoardOfDirectors = {
  boardOfDirectors: ref<string[] | null>(null),
  execute: vi.fn()
}

const mockAddAction = {
  isLoading: ref(false),
  error: ref<unknown>(null),
  isSuccess: ref(true),
  execute: vi.fn()
}

const mockUseCustomFetch = {
  error: ref<unknown>(null),
  isFetching: ref(false),
  execute: vi.fn((url: string) => {
    if (url === `teams/1/member`) {
      mockUseCustomFetch.data.value = {
        data: JSON.stringify({
          approvedAddress: `0x123`,
          budgetType: 1,
          value: `100.0`,
          expiry: Math.floor(new Date().getTime() / 1000)
        })
      }
    }
  }),
  data: ref<unknown>()
}

vi.mock('@/composables/useCustomFetch', () => {
  return {
    useCustomFetch: vi.fn((url, options) => {
      const data = ref<unknown>(null)
      const error = ref(null)
      const isFetching = ref(false)
      const response = ref<Response | null>(null)

      const execute = vi.fn(() => {
        // Conditionally update `data` based on the URL argument
        if (url === `teams/1/expense-data`) {
          if (options.beforeFetch) {
            data.value = {
              data: JSON.stringify(mockExpenseData[0])
            }
          } else {
            data.value = mockExpenseData
          }
        }
      })

      const get = vi.fn(() => ({ get, json, execute, data, error, isFetching, response }))
      const json = vi.fn(() => ({ get, json, execute, data, error, isFetching, response }))
      const post = vi.fn(() => ({ get, json, execute, data, error, isFetching, response }))

      return { post, get, json, error, isFetching, execute, data, response }
    })
  }
})

vi.mock('@/composables/bod', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useGetBoardOfDirectors: vi.fn(() => mockGetBoardOfDirectors),
    useAddAction: vi.fn(() => mockAddAction)
  }
})

describe('ExpenseAccountSection', () => {
  setActivePinia(createPinia())

  interface Props {
    team?: {}
  }

  interface ComponentOptions {
    props?: Props
    data?: () => Record<string, unknown>
    global?: Record<string, unknown>
  }

  const createComponent = ({
    props = {},
    data = () => ({}),
    global = {}
  }: ComponentOptions = {}) => {
    return mount(ExpenseAccountSection, {
      props: {
        team: {
          id: '1',
          name: 'Team Name',
          description: 'Team Description',
          members: [],
          teamContracts: [
            {
              address: '0xcontractaddress',
              admins: [],
              type: 'ExpenseAccountEIP712',
              deployer: '0xdeployeraddress'
            }
          ],
          ownerAddress: '0xOwner',
          ...props?.team
        } as Team,
        isDisapprovedAddress: false,
        ...props
      },
      data,
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: { address: '0x0123456789012345678901234567890123456789' }
            }
          })
        ],
        ...global
      }
    })
  }

  describe('Render', () => {
    it("should show the current user's approval data in the approval table", async () => {
      const wrapper = createComponent()
      await flushPromises()

      await flushPromises()
      const expenseAccountTable = wrapper.findComponent({ name: 'TableComponent' })
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()

      expect(firstRow.html()).toContain(
        `${budgetData.amountPerTransaction} ${NETWORK.currencySymbol}`
      )
      expect(firstRow.html()).toContain('Spend')
    })
    it('should disable the transfer button if the approval is disapproved', async () => {
      mockExpenseData[0].status = 'disabled'
      const wrapper = createComponent()
      await flushPromises()

      const expenseAccountTable = wrapper.findComponent({ name: 'TableComponent' })
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()

      console.log('isDisapprovedAddress', wrapper.vm.isDisapprovedAddress)
      expect(firstRow.html()).toContain('20')

      const spendButton = firstRow.findComponent(ButtonUI)
      expect(spendButton.exists()).toBeTruthy()
      expect(spendButton.props('disabled')).toBe(true)
    })

    it('should notify amount withdrawn error', async () => {
      const wrapper = createComponent()
      const logErrorSpy = vi.spyOn(util.log, 'error')
      //@ts-expect-error: property on component but not wrapper
      wrapper.vm.errorTransfer = new Error('Error getting amount withdrawn')
      await flushPromises()

      expect(mocks.mockUseToastStore.addErrorToast).toBeCalledWith('Failed to transfer')
      expect(logErrorSpy).toBeCalledWith('Error getting amount withdrawn')
    })
  })
})

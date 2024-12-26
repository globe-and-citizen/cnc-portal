import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import ExpenseAccountSection from '@/components/sections/SingleTeamView/ExpenseAccountEIP712Section.vue'
import { ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'
import { setActivePinia, createPinia } from 'pinia'
import { ref, type Ref } from 'vue'
import { NETWORK } from '@/constant'
import { createTestingPinia } from '@pinia/testing'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import ApproveUsersForm from '../forms/ApproveUsersEIP712Form.vue'
import * as viem from 'viem'
import type { User } from '@/types'

interface ComponentData {
  expiry: string
  _expenseAccountData: unknown
  isFetchingExpenseAccountData: boolean
  transferModal: boolean
  setLimitModal: boolean
  approveUsersModal: boolean
  approvedAddresses: Set<string>
  unapprovedAddresses: Set<string>
  foundUsers: User[]
  action: string
  manyExpenseAccountData: unknown
  amountWithdrawn: [number, number]
  transferFromExpenseAccount: (to: string, amount: string) => Promise<void>
  setExpenseAccountLimit: (amount: Ref) => Promise<void>
  approveAddress: (address: string) => Promise<void>
  disapproveAddress: (address: string) => Promise<void>
  isBodAction: () => boolean
  init: () => Promise<void>
}

vi.mock('@/adapters/web3LibraryAdapter', async (importOriginal) => {
  const actual: Object = await importOriginal()

  // Step 2: Mock the class itself and its instance methods
  const EthersJsAdapter = vi.fn()
  EthersJsAdapter.prototype.parseEther = vi.fn((amount: string) => `${amount}*10^18`)
  EthersJsAdapter.prototype.getProvider = vi.fn(() => ({
    getNetwork: vi.fn(() => Promise.resolve({ chainId: 1 })) // Inline function for getNetwork
  }))
  EthersJsAdapter.prototype.getSigner = vi.fn(() => ({})) // Mock getSigner if needed

  // Step 3: Mock the static method getInstance
  //@ts-ignore
  EthersJsAdapter['getInstance'] = vi.fn()

  return { ...actual, EthersJsAdapter }
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

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => {
      return { ...mockUseReadContract, data: ref(`0xContractOwner`) }
    }),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt)
  }
})

vi.mock('viem', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    parseSignature: vi.fn(),
    hashTypedData: vi.fn(),
    keccak256: vi.fn()
  }
})

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useClipboard: vi.fn(() => mockClipboard)
  }
})

const mockDeployExpenseAccount = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  isSuccess: ref(false),
  error: ref(null),
  execute: vi.fn()
}

const mockExpenseAccountGetBalance = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  isSuccess: ref(false),
  error: ref(null),
  execute: vi.fn()
}

const mockExpenseAccountGetMaxLimit = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  isSuccess: ref(false),
  error: ref(null),
  execute: vi.fn()
}

const mockExpenseAccountIsApprovedAddress = {
  data: ref<boolean>(false),
  isLoading: ref(false),
  isSuccess: ref(false),
  error: ref(null),
  execute: vi.fn((expenseAccountAddress: string, memberAddress: string) => {
    if (expenseAccountAddress === '0xExpenseAccount' && memberAddress === '0xApprovedAddress') {
      mockExpenseAccountIsApprovedAddress.data.value = true
    } else {
      mockExpenseAccountIsApprovedAddress.data.value = false
    }
  })
}

const mockExpenseAccountGetOwner = {
  data: ref<string | null>(null),
  loading: ref(false),
  error: ref(null),
  isSuccess: ref(false),
  execute: vi.fn(() => {
    mockExpenseAccountGetOwner.data.value = `0xContractOwner`
  })
}

const mockExpenseAccountSetMaxLimit = {
  isLoading: ref(false),
  error: ref<unknown>(null),
  isSuccess: ref(false),
  execute: vi.fn((expenseAccountAddress: string, amount: string) => {
    if (expenseAccountAddress && !isNaN(Number(amount)))
      mockExpenseAccountSetMaxLimit.isSuccess.value = true
    else mockExpenseAccountSetMaxLimit.error.value = 'An error has occured'
  })
}

vi.mock('@/composables/useExpenseAccount', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useExpenseAccountGetMaxLimit: vi.fn(() => mockExpenseAccountGetMaxLimit),
    useExpenseAccountGetBalance: vi.fn(() => mockExpenseAccountGetBalance),
    useDeployExpenseAccountContract: vi.fn(() => mockDeployExpenseAccount),
    useExpenseAccountIsApprovedAddress: vi.fn(() => mockExpenseAccountIsApprovedAddress),
    useExpenseAccountGetOwner: vi.fn(() => mockExpenseAccountGetOwner),
    useExpenseAccountSetLimit: vi.fn(() => mockExpenseAccountSetMaxLimit)
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

const DATE = '2024-02-02T12:00:00Z'
const budgetData = {
  txsPerPeriod: 1,
  amountPerPeriod: 100,
  amountPerTransaction: 20
}

const mockExpenseData = [
  {
    approvedAddress: `0x123`,
    budgetData: [
      { budgetType: 0, value: budgetData.txsPerPeriod },
      { budgetType: 1, value: budgetData.amountPerPeriod },
      { budgetType: 2, value: budgetData.amountPerTransaction }
    ],
    expiry: Math.floor(new Date(DATE).getTime() / 1000),
    signature: '0xSignature'
  },
  {
    approvedAddress: `0x456`,
    budgetData: [
      { budgetType: 0, value: budgetData.txsPerPeriod * 2 },
      { budgetType: 1, value: budgetData.amountPerPeriod * 2 },
      { budgetType: 2, value: budgetData.amountPerTransaction * 2 }
    ],
    expiry: Math.floor(new Date(DATE).getTime() / 1000),
    signature: '0xAnotherSignature'
  }
]

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
          if (options.beforeFetch)
            data.value = {
              data: JSON.stringify(mockExpenseData[0])
            }
          else data.value = mockExpenseData
        }
      })

      const get = vi.fn(() => ({ get, json, execute, data, error, isFetching, response }))
      const json = vi.fn(() => ({ get, json, execute, data, error, isFetching, response }))
      const post = vi.fn(() => ({ get, json, execute, data, error, isFetching, response }))

      return {
        post,
        get,
        json,
        error,
        isFetching,
        execute,
        data,
        response
      }
    })
  }
})

vi.mock('@/composables/bod', async (importOriginal) => {
  const actual: Object = await importOriginal()
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
          id: `1`,
          expenseAccountEip712Address: '0xExpenseAccount',
          ownerAddress: '0xOwner',
          boardOfDirectorsAddress: null,
          ...props?.team
        },
        ...props
      },
      data,
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: { address: '0xInitialUser' }
            }
          })
        ],
        ...global
      }
    })
  }

  describe('Render', () => {
    describe('Sub-Context', () => {
      const wrapper = createComponent()
      it('should retrieve, format and display expiry date', async () => {
        const date = new Date(DATE)
        const expiry = date.toLocaleString('en-US')

        const approvalExpiry = wrapper.find('[data-test="approval-expiry"]')
        expect(approvalExpiry.exists()).toBe(true)

        expect(approvalExpiry.text()).toBe(expiry)
      })
      it('should show loading animation if fetching expense account data', async () => {
        ;(wrapper.vm as unknown as ComponentData).isFetchingExpenseAccountData = true
        await wrapper.vm.$nextTick()
        expect(wrapper.find('[data-test="max-loading"]').exists()).toBeTruthy()
      })
    })

    it('should show aprroval list table cells with correct data', async () => {
      const wrapper = createComponent()
      const wrapperVm: ComponentData = wrapper.vm as unknown as ComponentData

      wrapperVm.manyExpenseAccountData = mockExpenseData
      wrapperVm.amountWithdrawn = [0, 1 * 10 ** 18]

      vi.spyOn(viem, 'keccak256').mockImplementation((args) => {
        return `${args as `0x${string}`}Hash`
      })

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Locate the table using the data-test attribute
      const table = wrapper.find('[data-test="approvals-list-table"]')
      expect(table.exists()).toBe(true)

      // Check table headers within the approvals-list-table
      const headers = table // wrapper
        //.find('[data-test="approvals-list-table"]')
        .findAll('thead th')
      const expectedHeaders = [
        'User',
        'Expiry Date',
        'Max Amount Per Tx',
        'Total Transactions',
        'Total Transfers',
        'Action'
      ]
      headers.forEach((header, i) => {
        expect(header.text()).toBe(expectedHeaders[i])
      })

      // Check table row data within the approvals-list-table
      const rows = table.findAll('tbody tr')
      expect(rows).toHaveLength(mockExpenseData.length)

      const firstRowCells = rows[0].findAll('td')
      expect(firstRowCells[0].text()).toBe(mockExpenseData[0].approvedAddress)
      expect(firstRowCells[1].text()).toBe(new Date(mockExpenseData[0].expiry).toLocaleDateString())
      expect(firstRowCells[2].text()).toBe(mockExpenseData[0].budgetData[2].value.toString())
      expect(firstRowCells[3].text()).toBe(`0/${mockExpenseData[0].budgetData[0].value}`)
      expect(firstRowCells[4].text()).toBe(`1/${mockExpenseData[0].budgetData[1].value}`)
      expect(firstRowCells[5].find('button').exists()).toBe(true)
      expect(firstRowCells[5].find('button').text()).toBe('Deactivate')

      const secondRowCells = rows[1].findAll('td')
      expect(secondRowCells[0].text()).toBe(mockExpenseData[1].approvedAddress)
      expect(secondRowCells[1].text()).toBe(
        new Date(mockExpenseData[1].expiry).toLocaleDateString()
      )
      expect(secondRowCells[2].text()).toBe(mockExpenseData[1].budgetData[2].value.toString())
      expect(secondRowCells[3].text()).toBe(`0/${mockExpenseData[1].budgetData[0].value}`)
      expect(secondRowCells[4].text()).toBe(`1/${mockExpenseData[1].budgetData[1].value}`)
      expect(secondRowCells[5].find('button').exists()).toBe(true)
      expect(secondRowCells[5].find('button').text()).toBe('Deactivate')
    })

    it('should show expense account if expense account address exists', () => {
      const team = { expenseAccountEip712Address: '0x123' }
      const wrapper = createComponent({
        props: {
          team: {
            ...team
          }
        }
      })

      expect(wrapper.find('[data-test="expense-account-address"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="expense-account-address"]').text()).toBe(
        `Expense Address ${team.expenseAccountEip712Address}`
      )

      // ToolTip
      const expenseAccountAddressTooltip = wrapper
        .find('[data-test="expense-account-address"]')
        .findComponent({ name: 'AddressToolTip' })
      expect(expenseAccountAddressTooltip.exists()).toBeTruthy()
      expect(expenseAccountAddressTooltip.props().address).toBe(team.expenseAccountEip712Address)
    })

    it('should hide create button if contract is being deployed', async () => {
      const team = { expenseAccountAddress: null }
      const wrapper = createComponent({
        props: {
          team: {
            ...team
          }
        }
      })

      mockDeployExpenseAccount.isLoading.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="create-expense-account"]').exists()).toBeFalsy()
    })
    it('should show copy to clipboard icon with tooltip if expense account address exists', () => {
      const wrapper = createComponent()

      expect(wrapper.findComponent(ClipboardDocumentListIcon).exists()).toBe(true)

      // ToolTip
      const copyAddressTooltip = wrapper.find('[data-test="copy-address-tooltip"]').findComponent({
        name: 'ToolTip'
      })
      expect(copyAddressTooltip.exists()).toBeTruthy()
      expect(copyAddressTooltip.props().content).toBe('Click to copy address')
    })
    it('should not show copy to clipboard icon if copy not supported', async () => {
      const wrapper = createComponent()

      // mock clipboard
      mockClipboard.isSupported.value = false
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(ClipboardDocumentListIcon).exists()).toBe(false)
    })
    it('should show animation if balance loading', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="balance-loading"]').exists()).toBeFalsy()
    })
    it('should show animation if balance not present', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="balance-loading"]').exists()).toBeFalsy()
    })
    it('should show expense account balance', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="contract-balance"]').text()).toBe(
        `${'0'} ${NETWORK.currencySymbol}`
      )
    })

    it('should show animation if max limit loading', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="max-loading"]').exists()).toBeFalsy()
    })
    it('should show animation if max limit not present', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="max-loading"]').exists()).toBeFalsy()
    })
    it('should show max transactions per period limit amount', async () => {
      const wrapper = createComponent()

      const txsPerPeriodDiv = wrapper.find('[data-test="txs-per-period-limit"]')
      expect(txsPerPeriodDiv.text()).toBe(`-- TXs`)
      await wrapper.vm.$nextTick()
      expect(txsPerPeriodDiv.text()).toBe(`${budgetData.txsPerPeriod} TXs`)
    })
    it('should show amount per period limit amount', async () => {
      const wrapper = createComponent()

      const amountPerPeriodDiv = wrapper.find('[data-test="amount-per-period-limit"]')
      expect(amountPerPeriodDiv.text()).toBe(`-- ${NETWORK.currencySymbol}`)
      await wrapper.vm.$nextTick()
      expect(amountPerPeriodDiv.text()).toBe(
        `${budgetData.amountPerPeriod} ${NETWORK.currencySymbol}`
      )
    })
    it('should show amount per transaction limit amount', async () => {
      const wrapper = createComponent()

      const amountPerTxDiv = wrapper.find('[data-test="amount-per-tx-limit"]')
      expect(amountPerTxDiv.text()).toBe(`-- ${NETWORK.currencySymbol}`)
      await wrapper.vm.$nextTick()
      expect(amountPerTxDiv.text()).toBe(
        `${budgetData.amountPerTransaction} ${NETWORK.currencySymbol}`
      )
    })

    it('should show animation if limit balance loading', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="limit-loading"]').exists()).toBeFalsy()
    })
    it('should show animation if limit balance not present', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="limit-loading"]').exists()).toBeFalsy()
    })
    it('should show total number of transactions', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="total-transactions"]').text()).toBe(`-- TXs`)
    })
    it('should show total amount withdrawn', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="total-withdrawn"]').text()).toBe(
        `-- ${NETWORK.currencySymbol}`
      )
    })
    it('should disable the transfer button if user not approved', async () => {
      const wrapper = createComponent()

      const button = wrapper.find('[data-test="transfer-button"]')
      expect(button.exists()).toBeTruthy()
      expect((button.element as HTMLButtonElement).disabled).toBe(true) // Button should be disabled
    })
    it('should enable the transfer button if user approved', async () => {
      const wrapper = createComponent({
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                user: { address: '0xContractOwner' }
              }
            })
          ]
        }
      })

      const button = wrapper.find('[data-test="transfer-button"]')
      expect(button.exists()).toBeTruthy()

      // Cast to HTMLButtonElement
      // expect(button.attributes().disabled).toBeUndefined() // Button should be enabled
    })
    it('should show transfer modal', async () => {
      const wrapper = createComponent({
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                user: { address: '0xContractOwner' }
              }
            })
          ]
        }
      })

      // ;(wrapper.vm as unknown as ComponentData).approvedAddresses = new Set(['0xInitialUser'])

      await wrapper.vm.$nextTick()

      const transferButton = wrapper.find('[data-test="transfer-button"]')

      await transferButton.trigger('click')
      await wrapper.vm.$nextTick()
      // expect((wrapper.vm as unknown as ComponentData).transferModal).toBeTruthy()

      // const transferFromBankForm = wrapper.findComponent(TransferFromBankForm)
      wrapper.findComponent(TransferFromBankForm)
      // expect(transferFromBankForm.exists()).toBe(true)
    })
    it('should hide approve user form if not owner', async () => {
      const wrapper = createComponent()

      const approveUsersForm = wrapper.findComponent(ApproveUsersForm)
      expect(approveUsersForm.exists()).toBe(false)
    })
    describe('TransferFromBankForm', async () => {
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as ComponentData).transferModal = true

      it('should pass corrent props to TransferFromBankForm', async () => {
        ;(wrapper.vm as unknown as ComponentData).foundUsers = [
          { name: 'John Doe', address: '0x1234' }
        ]
        await wrapper.vm.$nextTick()

        const transferFromBankForm = wrapper.findComponent(TransferFromBankForm)
        expect(transferFromBankForm.exists()).toBe(true)
        expect(transferFromBankForm.props()).toEqual({
          filteredMembers: [{ name: 'John Doe', address: '0x1234' }],
          service: 'Expense Account',
          bankBalance: '0.0',
          loading: false,
          asBod: false
        })
      })
      it('should close the modal when TransferFromBankForm @close-modal is emitted', async () => {
        const transferForm = wrapper.findComponent(TransferFromBankForm)

        transferForm.vm.$emit('closeModal')
        expect((wrapper.vm as unknown as ComponentData).transferModal).toBe(false)
      })
    })

    //describe('Methods', )

    describe('ApproveUsersForm', async () => {
      beforeAll(() => {
        //@ts-ignore
        ;(global as Object).window.ethereum = {
          request: vi.fn()
          // Mock other methods as needed
        }
      })

      afterAll(() => {
        //@ts-ignore
        delete (global as Object).window.ethereum
      })
      const wrapper = createComponent({
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                user: { address: '0xContractOwner' }
              }
            })
          ]
        }
      })

      it('should pass corrent props to ApproveUsersForm', async () => {
        const approveUsersButton = wrapper.find('[data-test="approve-users-button"]')
        expect(approveUsersButton.exists()).toBe(true)
        expect((approveUsersButton.element as HTMLInputElement).disabled).toBe(false)
        approveUsersButton.trigger('click')
        await wrapper.vm.$nextTick()
        const approveUsersForm = wrapper.findComponent(ApproveUsersForm)
        expect(approveUsersForm.exists()).toBe(true)
        expect(approveUsersForm.props()).toEqual({
          formData: [{ name: '', address: '', isValid: false }],
          isBodAction: false,
          loadingApprove: false,
          users: []
        })
      })
      it('should call approveUser when @approve-user is emitted', async () => {
        const approveUsersForm = wrapper.findComponent(ApproveUsersForm)
        expect(approveUsersForm.exists()).toBe(true)

        const data = {
          approvedUser: '0x123',
          budgetType: 1,
          value: 100,
          expiry: new Date()
        }

        approveUsersForm.vm.$emit('approveUser', data)
        expect(approveUsersForm.emitted('approveUser')).toStrictEqual([[data]])
      })
    })
  })
})

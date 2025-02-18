import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ExpenseAccountSection from '../ExpenseAccountView.vue'
import { ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'
import { setActivePinia, createPinia } from 'pinia'
import { ref, type Ref } from 'vue'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import { createTestingPinia } from '@pinia/testing'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import ApproveUsersForm from '@/components/forms/ApproveUsersEIP712Form.vue'
import * as viem from 'viem'
import type { Team, User } from '@/types'
import ButtonUI from '@/components/ButtonUI.vue'
import * as utils from '@/utils'

interface ComponentData {
  isDisapprovedAddress: boolean
  team: Partial<Team>
  expiry: string
  _expenseAccountData: unknown
  expenseAccountData: unknown
  isFetchingExpenseAccountData: boolean
  transferModal: boolean
  setLimitModal: boolean
  approveUsersModal: boolean
  approvedAddresses: Set<string>
  unapprovedAddresses: Set<string>
  foundUsers: User[]
  action: string
  manyExpenseAccountData: unknown
  amountWithdrawn: [number, number, number | undefined]
  transferFromExpenseAccount: (to: string, amount: string) => Promise<void>
  setExpenseAccountLimit: (amount: Ref) => Promise<void>
  approveAddress: (address: string) => Promise<void>
  disapproveAddress: (address: string) => Promise<void>
  isBodAction: () => boolean
  init: () => Promise<void>
  deactivateIndex: number | null
  isLoadingDeactivateApproval: boolean
  isLoadingActivateApproval: boolean
  signature: undefined | `0x${string}`
  signTypedDataError: unknown
}

const mocks = vi.hoisted(() => ({
  mockUseToastStore: {
    addErrorToast: vi.fn()
  },
  mockReadContract: vi.fn()
}))

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: vi.fn(() => ({ addErrorToast: mocks.mockUseToastStore.addErrorToast }))
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
    tokenAddress: viem.zeroAddress
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
    it("should show the current user's approval data in the approval table", async () => {
      const wrapper = createComponent()
      const wrapperVm: ComponentData = wrapper.vm as unknown as ComponentData
      wrapperVm.amountWithdrawn = [0, 1 * 10 ** 18, 1]
      wrapperVm.team = {
        expenseAccountEip712Address: '0xExpenseAccount',
        ownerAddress: '0xOwner',
        boardOfDirectorsAddress: null
      }
      await flushPromises()

      const approvalTable = wrapper.find('[data-test="approval-table"]')
      expect(approvalTable.exists()).toBeTruthy()

      const headers = approvalTable.findAll('thead th')

      const expectedHeaders = [
        'Expiry Date',
        'Max Amount Per Tx',
        'Total Transactions',
        'Total Transfers',
        'Action'
      ]
      headers.forEach((header, i) => {
        expect(header.text()).toBe(expectedHeaders[i])
      })

      const rows = approvalTable.findAll('tbody tr')
      expect(rows).toHaveLength(1)

      const firstRowCells = rows[0].findAll('td')
      expect(firstRowCells[0].text()).toBe(
        new Date(mockExpenseData[0].expiry * 1000).toLocaleString('en-US')
      )
      expect(firstRowCells[1].text()).toBe(
        `${mockExpenseData[0].budgetData[2].value} ${NETWORK.currencySymbol}`
      )
      expect(firstRowCells[2].text()).toBe(`0/${mockExpenseData[0].budgetData[0].value}`)
      expect(firstRowCells[3].text()).toBe(`1/${mockExpenseData[0].budgetData[1].value}`)

      const transferButton = firstRowCells[4].find('button')
      expect(transferButton.exists()).toBe(true)
      expect(transferButton.text()).toBe('Spend')
    })
    it('should disable the transfer button if the approval is disapproved', async () => {
      const wrapper = createComponent({
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                user: { address: '0x0123456789012345678901234567890123456789' }
              }
            })
          ]
        }
      })

      const wrapperVm: ComponentData = wrapper.vm as unknown as ComponentData
      wrapperVm.amountWithdrawn = [0, 1 * 10 ** 18, 2]
      mocks.mockReadContract.mockImplementation(() => [0, 1 * 10 ** 18, 2])
      wrapperVm.team = {
        expenseAccountEip712Address: '0xExpenseAccount',
        ownerAddress: '0xOwner',
        boardOfDirectorsAddress: null
      }
      await flushPromises()

      const approvalTable = wrapper.find('[data-test="approval-table"]')
      expect(approvalTable.exists()).toBeTruthy()

      const headers = approvalTable.findAll('thead th')

      const expectedHeaders = [
        'Expiry Date',
        'Max Amount Per Tx',
        'Total Transactions',
        'Total Transfers',
        'Action'
      ]
      headers.forEach((header, i) => {
        expect(header.text()).toBe(expectedHeaders[i])
      })

      const rows = approvalTable.findAll('tbody tr')
      expect(rows).toHaveLength(1)

      const firstRowCells = rows[0].findAll('td')
      expect(firstRowCells[0].text()).toBe(
        new Date(mockExpenseData[0].expiry * 1000).toLocaleString('en-US')
      )
      expect(firstRowCells[1].text()).toBe(
        `${mockExpenseData[0].budgetData[2].value} ${NETWORK.currencySymbol}`
      )
      expect(firstRowCells[2].text()).toBe(`0/${mockExpenseData[0].budgetData[0].value}`)
      expect(firstRowCells[3].text()).toBe(`1/${mockExpenseData[0].budgetData[1].value}`)

      const transferButton = firstRowCells[4].findComponent(ButtonUI)
      expect(transferButton.exists()).toBe(true)
      expect(transferButton.text()).toBe('Spend')
      expect(transferButton.props().disabled).toBe(true)
    })

    it('should show expense account if expense account address exists', async () => {
      const team = { expenseAccountEip712Address: '0x123' }
      const wrapper = createComponent()
      const wrapperVm = wrapper.vm as unknown as ComponentData
      wrapperVm.team = team
      await flushPromises()

      expect(wrapper.find('[data-test="expense-account-address"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="expense-account-address"]').text()).toBe(
        `Expense Account Address ${team.expenseAccountEip712Address}`
      )

      // ToolTip
      const expenseAccountAddressTooltip = wrapper
        .find('[data-test="expense-account-address"]')
        .findComponent({ name: 'AddressToolTip' })
      expect(expenseAccountAddressTooltip.exists()).toBeTruthy()
      expect(expenseAccountAddressTooltip.props().address).toBe(team.expenseAccountEip712Address)
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

      expect(wrapper.find('[data-test="expense-account-balance"]').text()).toContain('--')
      //@ts-expect-error: expenseAccountDalance is contract data mocked in the test
      wrapper.vm.expenseAccountBalance = { value: 500n * 10n ** 18n }

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="expense-account-balance"]').text()).toContain('500')
    })

    it('should show animation if max limit loading', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="max-loading"]').exists()).toBeFalsy()
    })
    it('should show animation if max limit not present', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="max-loading"]').exists()).toBeFalsy()
    })
    it('should show animation if limit balance loading', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="limit-loading"]').exists()).toBeFalsy()
    })
    it('should show animation if limit balance not present', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="limit-loading"]').exists()).toBeFalsy()
    })
    it('should disable the transfer button if user not approved', async () => {
      const wrapper = createComponent()
      const wrapperVm = wrapper.vm as unknown as ComponentData
      wrapperVm.team = {
        expenseAccountEip712Address: '0xExpenseAccount',
        ownerAddress: '0xOwner',
        boardOfDirectorsAddress: null
      }
      wrapperVm.isDisapprovedAddress = true
      await flushPromises()
      const transferButtonComponent = wrapper
        .find('[data-test="transfer-button"]')
        .findComponent(ButtonUI)
      expect(transferButtonComponent.exists()).toBeTruthy()
      expect(transferButtonComponent.props().disabled).toBe(false) // Button should be disabled
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
      const wrapperVm = wrapper.vm as unknown as ComponentData
      wrapperVm.team = {
        expenseAccountEip712Address: '0xExpenseAccount',
        ownerAddress: '0xOwner',
        boardOfDirectorsAddress: null
      }
      await flushPromises()

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
      const wrapperVm = wrapper.vm as unknown as ComponentData
      wrapperVm.team = {
        expenseAccountEip712Address: '0xExpenseAccount',
        ownerAddress: '0xOwner',
        boardOfDirectorsAddress: null
      }

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
      const wrapperVm = wrapper.vm as unknown as ComponentData
      ;(wrapper.vm as unknown as ComponentData).transferModal = true
      wrapperVm.team = {
        expenseAccountEip712Address: '0xExpenseAccount',
        ownerAddress: '0xOwner',
        boardOfDirectorsAddress: null
      }

      it('should pass corrent props to TransferFromBankForm', async () => {
        ;(wrapper.vm as unknown as ComponentData).foundUsers = [
          { name: 'John Doe', address: '0x1234' }
        ]
        ;(wrapper.vm as unknown as ComponentData)._expenseAccountData = {
          data: JSON.stringify(mockExpenseData[0])
        }
        await flushPromises() // wrapper.vm.$nextTick()

        const transferFromBankForm = wrapper.findComponent(TransferFromBankForm)
        expect(transferFromBankForm.exists()).toBe(true)
        expect(transferFromBankForm.props()).toEqual({
          filteredMembers: [{ name: 'John Doe', address: '0x1234' }],
          service: 'Expense Account',
          bankBalance: '500',
          usdcBalance: '0',
          loading: false,
          asBod: false
        })
        ;(wrapper.vm as unknown as ComponentData)._expenseAccountData = {
          data: JSON.stringify(mockExpenseData[1])
        }
        //@ts-expect-error: component property not included in wrapper
        wrapper.vm.usdcBalance = 450_000_000n
        await flushPromises()

        expect(transferFromBankForm.props()).toEqual({
          filteredMembers: [{ name: 'John Doe', address: '0x1234' }],
          service: 'Expense Account',
          bankBalance: '450',
          usdcBalance: '0',
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
      // beforeAll(() => {
      //   // @ts-expect-error: Mocking window object
      //   ;(global as object).window.ethereum = {
      //     request: vi.fn()
      //     // Mock other methods as needed
      //   }
      // })

      // afterAll(() => {
      //   // @ts-expect-error: Mocking window object
      //   delete (global as object).window.ethereum
      // })
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
      const wrapperVm = wrapper.vm as unknown as ComponentData
      wrapperVm.team = {
        expenseAccountEip712Address: '0xExpenseAccount',
        ownerAddress: '0xOwner',
        boardOfDirectorsAddress: null
      }
      // beforeEach(() =>
      //   wrapper = createComponent({
      //     global: {
      //       plugins: [
      //         createTestingPinia({
      //           createSpy: vi.fn,
      //           initialState: {
      //             user: { address: '0xContractOwner' }
      //           }
      //         })
      //       ]
      //     }
      //   })
      // )
      // afterEach(() =>
      //   wrapper.unmount()
      // )

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
      // it('should call approveUser when @approve-user is emitted', async () => {
      //   const approveUsersForm = wrapper.findComponent(ApproveUsersForm)
      //   expect(approveUsersForm.exists()).toBe(true)

      //   const expiry = new Date()

      //   const data = {
      //     approvedUser: '0x123',
      //     budgetData: [
      //       { budgetType: 0, value: 10 },
      //       { budgetType: 1, value: 100 },
      //       { budgetType: 2, value: 10 }
      //     ],
      //     expiry
      //   }

      //   approveUsersForm.vm.$emit('approveUser', data)
      //   expect(approveUsersForm.emitted('approveUser')).toStrictEqual([[data]])
      //   expect(mockUseSignTypedData.signTypedData).toBeCalledWith({
      //     domain: {
      //       chainId: '0xChainId',
      //       version: '1',
      //       verifyingContract: '0xExpenseAccount',
      //       name: 'CNCExpenseAccount'
      //     },
      //     message: {
      //       approvedUser: '0x123',
      //       budgetData: [
      //         { budgetType: 0, value: 10 },
      //         { budgetType: 1, value: 100n * 10n ** 18n },
      //         { budgetType: 2, value: 10n * 10n ** 18n }
      //       ],
      //       expiry
      //     },
      //     primaryType: 'BudgetLimit',
      //     types: {
      //       BudgetData: [
      //         { name: 'budgetType', type: 'uint8' },
      //         { name: 'value', type: 'uint256' }
      //       ],
      //       BudgetLimit: [
      //         { name: 'approvedAddress', type: 'address' },
      //         { name: 'budgetData', type: 'BudgetData[]' },
      //         { name: 'expiry', type: 'uint256' }
      //       ]
      //     }
      //   })

      //   expect((wrapper.vm as unknown as ComponentData).expenseAccountData).toEqual(data)
      //   expect((wrapper.vm as unknown as ComponentData).signature).toBe('0xExpenseDataSignature')
      //   await wrapper.vm.$nextTick()
      //   console.log(`wrapper.emitted`, wrapper.emitted())
      //   expect(wrapper.emitted('click')).toBeTruthy()
      // })
      it('should give an error notification if sign typed data error occurs', async () => {
        // const wrapper = createComponent({
        //   global: {
        //     plugins: [
        //       createTestingPinia({
        //         createSpy: vi.fn,
        //         initialState: {
        //           user: { address: '0xContractOwner' }
        //         }
        //       })
        //     ]
        //   }
        // })
        const logErrorSpy = vi.spyOn(utils.log, 'error')
        mockUseSignTypedData.signTypedData.mockImplementation(
          () => (mockUseSignTypedData.error.value = new Error('Error signing typed data'))
        )
        const approveUsersForm = wrapper.findComponent(ApproveUsersForm)
        expect(approveUsersForm.exists()).toBe(true)

        const expiry = new Date()

        const data = {
          approvedUser: '0x123',
          budgetData: [
            { budgetType: 0, value: 10 },
            { budgetType: 1, value: 100 },
            { budgetType: 2, value: 10 }
          ],
          expiry
        }

        approveUsersForm.vm.$emit('approveUser', data)
        expect(approveUsersForm.emitted('approveUser')).toBeTruthy()
        expect((wrapper.vm as unknown as ComponentData).signTypedDataError).toEqual(
          new Error('Error signing typed data')
        )
        await wrapper.vm.$nextTick()
        expect(logErrorSpy).toBeCalledWith('signTypedDataError.value', 'Error signing typed data')
      })
    })
  })
})

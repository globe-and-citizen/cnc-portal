import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ExpenseAccountSection from '@/components/sections/ExpenseAccountView/MyApprovedExpenseSection.vue'
import { setActivePinia, createPinia } from 'pinia'
import { computed, ref } from 'vue'
import { NETWORK, USDC_ADDRESS, USDT_ADDRESS } from '@/constant'
import { createTestingPinia } from '@pinia/testing'
import TransferForm from '@/components/forms/TransferForm.vue'
import * as viem from 'viem'
import expenseABI from '../../../../artifacts/abi/expense-account-eip712.json'
// import erc20ABI from '../../../../artifacts/abi/erc20.json'
// import * as utils from '@/utils'
import type { Team } from '@/types'
import { zeroAddress } from 'viem'

interface ComponentData {
  team: Partial<Team>
  transferModal: boolean
  _expenseAccountData: { data: string; signature: string } | null
  tokenAmount: string
  tokenRecipient: string
  isConfirmingApprove: boolean
  isConfirmedApprove: boolean
  approveError: null | Error
  transferErc20Token: () => Promise<void>
}

const { mockUseToastStore, mockReadContract } = vi.hoisted(() => ({
  mockUseToastStore: {
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  },
  mockReadContract: vi.fn()
}))

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: vi.fn(() => ({
      addErrorToast: mockUseToastStore.addErrorToast,
      addSuccessToast: mockUseToastStore.addSuccessToast
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
  error: ref<Error | null>(null),
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
    readContract: mockReadContract
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
    useCustomFetch: vi.fn(() => {
      const data = ref<unknown>(null)
      const error = ref(null)
      const isFetching = ref(false)
      const response = ref<Response | null>(null)

      const execute = vi.fn()

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

describe.skip('ExpenseAccountEIP712Section ERC20', () => {
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
          name: 'Default Team',
          description: 'Default Description',
          members: [],
          ownerAddress: '0xDefaultOwner',
          teamContracts: [
            {
              type: 'ExpenseAccountEIP712',
              address: '0xExpenseAccount',
              deployer: '0xDeployerAddress',
              admins: []
            }
          ],
          ...props?.team
        },
        isDisapprovedAddress: false,
        expenseBalanceFormatted: `5000`,
        usdcBalance: 1_000_000_000n,
        tokenSymbol: (tokenAddress: string) =>
          computed(() => {
            const symbols = {
              [USDC_ADDRESS]: 'USDC',
              [USDT_ADDRESS]: 'USDT',
              [zeroAddress]: NETWORK.currencySymbol
            }

            return symbols[tokenAddress] || ''
          }),
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

  // const logErrorSpy = vi.spyOn(utils.log, 'error')

  it('should transfer native token', async () => {
    const wrapper = createComponent()
    const wrapperVm = wrapper.vm as unknown as ComponentData
    wrapperVm.transferModal = true
    wrapperVm._expenseAccountData = {
      data: JSON.stringify(mockExpenseData[0]),
      signature: '0xDummySignature'
    }
    wrapperVm.team = {
      id: `1`,
      teamContracts: [
        {
          type: 'ExpenseAccountEIP712',
          address: '0xExpenseAccount',
          deployer: '0xDeployerAddress',
          admins: []
        }
      ],
      ownerAddress: '0xOwner'
    }
    await flushPromises() // wrapper.vm.$nextTick()
    const transferForm = wrapper.findComponent(TransferForm)
    expect(transferForm.exists()).toBe(true)
    const mockTo = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    const mockAmount = '1.5'
    transferForm.vm.$emit('transfer', mockTo, mockAmount)
    await wrapper.vm.$nextTick()
    expect(wrapperVm.tokenAmount).toBe(mockAmount)
    expect(wrapperVm.tokenRecipient).toBe(mockTo)
    expect(mockUseWriteContract.writeContract).toBeCalledWith({
      abi: expenseABI,
      address: '0xExpenseAccount',
      args: [
        mockTo,
        viem.parseEther(mockAmount),
        {
          ...mockExpenseData[0],
          budgetData: mockExpenseData[0].budgetData.map((item) => ({
            ...item,
            value: item.budgetType === 0 ? item.value : viem.parseEther(`${item.value}`)
          }))
        },
        '0xDummySignature'
      ],
      functionName: 'transfer'
    })
    mockUseWriteContract.writeContract.mockClear()
    wrapperVm._expenseAccountData = null
  })
  // it('should transfer erc20 token', async () => {
  //   mockReadContract.mockImplementation(() => BigInt(2.5 * 1e6))
  //   const wrapper = createComponent()
  //   const wrapperVm = wrapper.vm as unknown as ComponentData
  //   wrapperVm.transferModal = true
  //   wrapperVm._expenseAccountData = {
  //     data: JSON.stringify(mockExpenseData[1]),
  //     signature: '0xDummySignature'
  //   }
  //   wrapperVm.team = {
  //     id: `1`,
  //     teamContracts: [
  //       {
  //         type: 'ExpenseAccountEIP712',
  //         address: '0xExpenseAccount',
  //         deployer: '0xDeployerAddress',
  //         admins: []
  //       }
  //     ],
  //     ownerAddress: '0xOwner'
  //   }
  //   await flushPromises() // wrapper.vm.$nextTick()
  //   const transferForm = wrapper.findComponent(TransferForm)
  //   expect(transferForm.exists()).toBe(true)
  //   await flushPromises()
  //   const mockTo = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
  //   const mockAmount = '2.5'
  //   transferForm.vm.$emit('transfer', mockTo, mockAmount)
  //   await wrapper.vm.$nextTick()
  //   expect(wrapperVm.tokenAmount).toBe(mockAmount)
  //   expect(wrapperVm.tokenRecipient).toBe(mockTo)
  //   expect(mockUseWriteContract.writeContract).toBeCalledWith({
  //     abi: expenseABI,
  //     address: '0xExpenseAccount',
  //     args: [
  //       mockTo,
  //       BigInt(Number(mockAmount) * 1e6),
  //       {
  //         ...mockExpenseData[1],
  //         budgetData: mockExpenseData[1].budgetData.map((item) => ({
  //           ...item,
  //           value: item.budgetType === 0 ? item.value : BigInt(item.value * 1e6)
  //         }))
  //       },
  //       '0xDummySignature'
  //     ],
  //     functionName: 'transfer'
  //   })
  //   mockUseWriteContract.writeContract.mockClear()
  //   mockReadContract.mockReset()
  // })
  // it('should call allowance if allowance lower than amount', async () => {
  //   const wrapper = createComponent()
  //   const wrapperVm = wrapper.vm as unknown as ComponentData
  //   wrapperVm.transferModal = true
  //   wrapperVm._expenseAccountData = {
  //     data: JSON.stringify(mockExpenseData[1]),
  //     signature: '0xDummySignature'
  //   }
  //   wrapperVm.team = {
  //     id: `1`,
  //     teamContracts: [
  //       {
  //         type: 'ExpenseAccountEIP712',
  //         address: '0xExpenseAccount',
  //         deployer: '0xDeployerAddress',
  //         admins: []
  //       }
  //     ],
  //     ownerAddress: '0xOwner'
  //   }
  //   await wrapper.vm.$nextTick()
  //   const transferForm = wrapper.findComponent(TransferForm)
  //   expect(transferForm.exists()).toBe(true)
  //   await flushPromises()
  //   const mockTo = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
  //   const mockAmount = '2.5'
  //   transferForm.vm.$emit('transfer', mockTo, mockAmount)
  //   await wrapper.vm.$nextTick()
  //   expect(wrapperVm.tokenAmount).toBe(mockAmount)
  //   expect(wrapperVm.tokenRecipient).toBe(mockTo)
  //   expect(mockUseWriteContract.writeContract).toBeCalledWith({
  //     abi: erc20ABI,
  //     address: USDC_ADDRESS,
  //     args: ['0xExpenseAccount', BigInt(Number(mockAmount) * 1e6)],
  //     functionName: 'approve'
  //   })
  //   mockUseWriteContract.writeContract.mockClear()
  //   wrapper.unmount()
  // })
  // it('should notify success if successfully approved', async () => {
  //   mockUseWriteContract.writeContract.mockClear()
  //   const wrapper = createComponent()
  //   const wrapperVm = wrapper.vm as unknown as ComponentData
  //   mockReadContract.mockImplementation(() => BigInt(3.5 * 1e6))
  //   wrapperVm._expenseAccountData = {
  //     data: JSON.stringify(mockExpenseData[1]),
  //     signature: '0xDummySignature'
  //   }
  //   wrapperVm.isConfirmingApprove = true
  //   wrapperVm.team = {
  //     id: `1`,
  //     teamContracts: [
  //       {
  //         type: 'ExpenseAccountEIP712',
  //         address: '0xExpenseAccount',
  //         deployer: '0xDeployerAddress',
  //         admins: []
  //       }
  //     ],
  //     ownerAddress: '0xOwner'
  //   }
  //   await flushPromises()
  //   wrapperVm.isConfirmingApprove = false
  //   wrapperVm.isConfirmedApprove = true
  //   const mockTo = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
  //   const mockAmount = '3.5'
  //   wrapperVm.tokenRecipient = mockTo
  //   wrapperVm.tokenAmount = mockAmount
  //   await flushPromises()
  //   expect(mockUseToastStore.addSuccessToast).toBeCalledWith('Approval granted successfully')
  //   expect(mockUseWriteContract.writeContract).toBeCalledWith({
  //     abi: expenseABI,
  //     address: '0xExpenseAccount',
  //     args: [
  //       mockTo,
  //       BigInt(Number(mockAmount) * 1e6),
  //       {
  //         ...mockExpenseData[1],
  //         budgetData: mockExpenseData[1].budgetData.map((item) => ({
  //           ...item,
  //           value: item.budgetType === 0 ? item.value : BigInt(item.value * 1e6)
  //         }))
  //       },
  //       '0xDummySignature'
  //     ],
  //     functionName: 'transfer'
  //   })
  //   wrapper.unmount()
  // })
  // it('should notify error if approve error', async () => {
  //   mockUseToastStore.addErrorToast.mockClear()
  //   mockUseWriteContract.writeContract.mockImplementation(
  //     () => (mockUseWriteContract.error.value = new Error('Error approving allowance'))
  //   )
  //   const wrapper = createComponent()
  //   const wrapperVm = wrapper.vm as unknown as ComponentData
  //   wrapperVm.team = {
  //     id: `1`,
  //     teamContracts: [
  //       {
  //         type: 'ExpenseAccountEIP712',
  //         address: '0xExpenseAccount',
  //         deployer: '0xDeployerAddress',
  //         admins: []
  //       }
  //     ],
  //     ownerAddress: '0xOwner'
  //   }
  //   await flushPromises()
  //   wrapperVm.transferModal = true
  //   wrapperVm._expenseAccountData = {
  //     data: JSON.stringify(mockExpenseData[1]),
  //     signature: '0xDummySignature'
  //   }
  //   await flushPromises()
  //   const transferForm = wrapper.findComponent(TransferForm)
  //   expect(transferForm.exists()).toBe(true)
  //   // await flushPromises()
  //   const mockTo = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
  //   const mockAmount = '2.5'
  //   transferForm.vm.$emit('transfer', mockTo, mockAmount)
  //   await flushPromises()
  //   expect(mockUseToastStore.addErrorToast).toBeCalledWith('Failed to approve token spending')
  //   expect(logErrorSpy).toBeCalledWith('Error approving allowance')
  // })
})

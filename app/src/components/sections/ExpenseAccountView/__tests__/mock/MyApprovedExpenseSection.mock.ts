import { vi } from 'vitest'
import * as viem from 'viem'
import { USDC_ADDRESS } from '@/constant'
import { ref } from 'vue'

const DATE = '2024-02-02T12:00:00Z'

export const budgetData = {
  txsPerPeriod: 1,
  amountPerPeriod: 100,
  amountPerTransaction: 20
}

export const mockExpenseData = [
  {
    approvedAddress: `0x0123456789012345678901234567890123456789`,
    name: 'John Doe',
    budgetData: [
      { budgetType: 0, value: budgetData.txsPerPeriod },
      { budgetType: 1, value: budgetData.amountPerPeriod },
      { budgetType: 2, value: budgetData.amountPerTransaction }
    ],
    expiry: Math.floor(new Date(DATE).getTime() / 1000),
    signature: '0xNativeTokenSignature',
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

export const mockExpenseDataStore = {
  allExpenseDataParsed: mockExpenseData,
  myApprovedExpenses: [mockExpenseData[0]],
  fetchAllExpenseData: vi.fn()
}

export const mockTeamStore = {
  currentTeam: {
    id: '1',
    name: 'Team Name',
    description: 'Team Description',
    members: [],
    teamContracts: [
      {
        address: '0xExpenseAccountAddress',
        admins: [],
        type: 'ExpenseAccountEIP712',
        deployer: '0xdeployeraddress'
      }
    ],
    ownerAddress: '0xOwner'
  }
}

// const mockUseReadContractRefetch = vi.fn()

export const mockUseReadContract = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}

export const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}

export const mockUseBalance = {
  data: ref(null),
  refetch: vi.fn(),
  error: ref(null),
  isLoading: ref(false)
}

export const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}

export const mockUseSignTypedData = {
  error: ref<Error | null>(null),
  data: ref<string | undefined>(),
  signTypedData: vi.fn()
}

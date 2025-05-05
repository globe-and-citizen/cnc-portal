import { describe, expect, it, vi } from 'vitest'
import { useExpenseGetFunction } from '../useExpenseAccount'
//import { ExpenseAccountEventType, type EventResult } from '@/types'
import type { Result } from 'ethers'

// mock web3Util
vi.mock('@/utils/web3Util')
vi.mock('@/utils', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    log: mockLog
  }
})

const mockEventResults = [
  {
    txHash: '0x1',
    data: ['0xDepositor1', '1000000000000000000'] as Result, // 1 ETH
    date: '01/01/2022 00:00'
  }
]

const {
  expenseAccountBalance,
  expenseAccountAddress,
  expenseAccountOwner,
  expenseAccountMaxLimit,
  tx,
  mockFunc,
  mockLog
  //mockEvents
} = vi.hoisted(() => {
  return {
    expenseAccountBalance: '1',
    expenseAccountAddress: '0x123',
    expenseAccountOwner: '0xOwner',
    expenseAccountUser: '0xUser',
    expenseAccountMaxLimit: '1',
    tx: {
      hash: '0x1'
    },
    mockEvents: [
      {
        transactionHash: '0x1',
        data: '0x1',
        topics: ['0x1', '0x2', '0x3'],
        getBlock: vi.fn().mockImplementation(() =>
          Promise.resolve({
            date: new Date('2022-01-01 00:00:00')
          })
        )
      }
    ],
    mockFunc: {
      name: 'setMaxLimit',
      args: [BigInt(1000000000000000000n)],
      fragment: {
        inputs: [
          {
            name: 'amount',
            type: 'uint256'
          }
        ]
      }
    },
    mockLog: {
      error: vi.fn(),
      parseError: vi.fn()
    }
  }
})

const { expenseAccountService } = vi.hoisted(() => {
  return {
    expenseAccountService: {
      createExpenseAccountContract: vi.fn().mockReturnValue(Promise.resolve(expenseAccountAddress)),
      deposit: vi.fn().mockReturnValue(Promise.resolve(tx)),
      transfer: vi.fn().mockReturnValue(Promise.resolve(tx)),
      getBalance: vi.fn().mockReturnValue(Promise.resolve(expenseAccountBalance)),
      getOwner: vi.fn().mockReturnValue(Promise.resolve(expenseAccountOwner)),
      getMaxLimit: vi.fn().mockReturnValue(Promise.resolve(expenseAccountMaxLimit)),
      setMaxLimit: vi.fn().mockReturnValue(Promise.resolve(tx)),
      approveAddress: vi.fn().mockReturnValue(Promise.resolve(tx)),
      disapproveAddress: vi.fn().mockReturnValue(Promise.resolve(tx)),
      isApprovedAddress: vi.fn().mockReturnValue(Promise.resolve(true)),
      transferOwnership: vi.fn().mockReturnValue(Promise.resolve(tx)),
      getContract: vi.fn().mockImplementation(() => {
        return {
          address: expenseAccountAddress,
          interface: {
            decodeEventLog: vi.fn().mockReturnValue(mockEventResults[0].data),
            parseTransaction: vi.fn().mockReturnValue(mockFunc)
          }
        }
      }),
      web3Library: {
        initialize: vi.fn(),
        connectWallet: vi.fn(),
        getBalance: vi.fn().mockReturnValue(expenseAccountAddress)
      }
    }
  }
})

vi.mock('@/services/expenseAccountService', () => {
  return {
    ExpenseAccountService: vi.fn().mockImplementation(() => expenseAccountService)
  }
})

describe('Expense Account Composables', () => {
  describe('useExpenseGetFunction', () => {
    it('should set initial values correctly', () => {
      const {
        execute: getFunction,
        data,
        inputs,
        args
      } = useExpenseGetFunction(expenseAccountAddress)

      expect(getFunction).toBeInstanceOf(Function)
      expect(data.value).toBe(undefined)
      expect(inputs.value).toStrictEqual([])
      expect(args.value).toStrictEqual([])
    })

    it('should returns data correctly', async () => {
      const {
        execute: getFunction,
        data,
        inputs,
        args
      } = useExpenseGetFunction(expenseAccountAddress)
      await getFunction('data')
      expect(data.value).toStrictEqual('setMaxLimit')
      expect(args.value).toStrictEqual(['1.0'])
      expect(inputs.value).toStrictEqual(['amount'])
    })
  })
})

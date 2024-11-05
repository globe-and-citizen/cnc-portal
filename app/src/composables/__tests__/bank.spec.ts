import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBankEvents, useBankGetFunction } from '../bank'
import { BankEventType, type EventResult } from '@/types'
import type { Result } from 'ethers'

// mock web3Util
vi.mock('@/utils/web3Util')
vi.mock('@/utils', async (importOriginal) => {
  const original: Object = await importOriginal()
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

const { bankBalance, bankAddress, tx, mockEvents, mockFunc, mockLog } = vi.hoisted(() => {
  return {
    bankBalance: '1',
    bankAddress: '0x123',
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
      name: 'transfer',
      args: ['0x123', BigInt(1000000000000000000n)],
      fragment: {
        inputs: [
          {
            name: 'to',
            type: 'address'
          },
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

const { bankService } = vi.hoisted(() => {
  return {
    bankService: {
      createBankContract: vi.fn().mockReturnValue(Promise.resolve(bankAddress)),
      deposit: vi.fn().mockReturnValue(Promise.resolve(tx)),
      transfer: vi.fn().mockReturnValue(Promise.resolve(tx)),
      transferOwnership: vi.fn().mockReturnValue(Promise.resolve(tx)),
      isPaused: vi.fn().mockReturnValue(Promise.resolve(false)),
      pause: vi.fn().mockReturnValue(Promise.resolve(tx)),
      unpause: vi.fn().mockReturnValue(Promise.resolve(tx)),
      getOwner: vi.fn().mockReturnValue(Promise.resolve('0x123')),
      getEvents: vi.fn().mockReturnValue(Promise.resolve(mockEvents)),
      getContract: vi.fn().mockImplementation(() => {
        return {
          address: bankAddress,
          interface: {
            decodeEventLog: vi.fn().mockReturnValue(mockEventResults[0].data),
            parseTransaction: vi.fn().mockReturnValue(mockFunc)
          }
        }
      }),
      web3Library: {
        initialize: vi.fn(),
        connectWallet: vi.fn(),
        getBalance: vi.fn().mockReturnValue(bankBalance)
      }
    }
  }
})

// mock BankService
vi.mock('@/services/bankService', () => {
  return {
    BankService: vi.fn().mockImplementation(() => bankService)
  }
})

describe('Bank', () => {
  describe('useBankEvents', () => {
    it('should set initial values correctly', async () => {
      const { getEvents, loading, error, events } = useBankEvents(bankAddress)
      expect(getEvents).toBeInstanceOf(Function)
      expect(loading.value).toBe(false)
      expect(error.value).toBe(null)
      expect(events.value).toStrictEqual([] as EventResult[])
    })

    describe('when success', () => {
      it('should change state of events correctly', async () => {
        const { getEvents, events } = useBankEvents(bankAddress)
        expect(events.value).toStrictEqual([] as EventResult[])
        await getEvents(BankEventType.Deposit)
        expect(bankService.getEvents).toHaveBeenCalledWith(bankAddress, BankEventType.Deposit)
        expect(events.value).toStrictEqual(mockEventResults)
      })

      it('should change state of loading correctly', async () => {
        const { getEvents, loading } = useBankEvents(bankAddress)
        const promise = getEvents(BankEventType.Deposit)
        expect(loading.value).toBe(true)
        await promise
        expect(loading.value).toBe(false)
      })

      it('should keeps state of error', async () => {
        const { getEvents, error } = useBankEvents(bankAddress)
        expect(error.value).toBe(null)
        await getEvents(BankEventType.Deposit)
        expect(bankService.getEvents).toHaveBeenCalledWith(bankAddress, BankEventType.Deposit)
        expect(error.value).toBe(null)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(bankService.getEvents).mockRejectedValue(mockError)
      })

      it('should keeps state of events to be empty array', async () => {
        const { getEvents, events } = useBankEvents(bankAddress)
        expect(events.value).toStrictEqual([] as EventResult[])
        await getEvents(BankEventType.Deposit)
        expect(bankService.getEvents).toHaveBeenCalledWith(bankAddress, BankEventType.Deposit)
        expect(events.value).toStrictEqual([])
      })

      it('should change state of loading correctly', async () => {
        const { getEvents, loading } = useBankEvents(bankAddress)
        const promise = getEvents(BankEventType.Deposit)
        expect(loading.value).toBe(true)
        await promise
        expect(loading.value).toBe(false)
      })

      it('should change state of error correctly', async () => {
        const { getEvents, error } = useBankEvents(bankAddress)
        expect(error.value).toBe(null)
        await getEvents(BankEventType.Deposit)
        expect(bankService.getEvents).toHaveBeenCalledWith(bankAddress, BankEventType.Deposit)
        expect(error.value).toBe(mockError)
      })
    })
  })

  describe('useBankGetFunction', () => {
    it('should set initial values correctly', () => {
      const { execute: getFunction, data, inputs, args } = useBankGetFunction(bankAddress)

      expect(getFunction).toBeInstanceOf(Function)
      expect(data.value).toBe(undefined)
      expect(inputs.value).toStrictEqual([])
      expect(args.value).toStrictEqual([])
    })

    it('should returns data correctly', async () => {
      const { execute: getFunction, data, args, inputs } = useBankGetFunction(bankAddress)
      await getFunction('data')
      expect(data.value).toStrictEqual('transfer')
      expect(args.value).toStrictEqual(['0x123', '1.0'])
      expect(inputs.value).toStrictEqual(['to', 'amount'])
    })

    it('logs error when getFunction fails', async () => {
      const mockError = new Error('error')
      vi.mocked(bankService.getContract).mockRejectedValue(mockError)
      const { execute: getFunction } = useBankGetFunction(bankAddress)
      await getFunction('data')
      expect(mockLog.error).toHaveBeenCalled()
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useBankDeposit,
  useBankEvents,
  useBankGetFunction,
  useBankPause,
  useBankTransfer,
  useBankTransferOwnership,
  useBankUnpause
} from '../bank'
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

// mock BankService
// const teamId = '1'
const amount = '1'
const to = '0x123'

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
  describe('useBankDeposit', () => {
    it('should set initial values correctly', async () => {
      const { execute: deposit, isLoading, error, transaction, isSuccess } = useBankDeposit()
      expect(deposit).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(transaction.value).toBe(undefined)
      expect(error.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of transaction correctly', async () => {
        const { execute: deposit, transaction } = useBankDeposit()
        expect(transaction.value).toBe(undefined)
        await deposit(bankAddress, amount)
        expect(bankService.deposit).toHaveBeenCalledWith(bankAddress, amount)
        expect(transaction.value).not.toBe(tx)
      })

      it('should change state of isLoading correctly', async () => {
        const { execute: deposit, isLoading } = useBankDeposit()
        const promise = deposit(bankAddress, amount)
        expect(bankService.deposit).toHaveBeenCalledWith(bankAddress, amount)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })

      it('should change state of isSuccess correctly', async () => {
        const { execute: deposit, isSuccess } = useBankDeposit()
        expect(isSuccess.value).toBe(false)
        await deposit(bankAddress, amount)
        expect(bankService.deposit).toHaveBeenCalledWith(bankAddress, amount)
        expect(isSuccess.value).toBe(true)
      })

      it('should keeps state of error', async () => {
        const { execute: deposit, error } = useBankDeposit()
        expect(error.value).toBe(null)
        await deposit(bankAddress, amount)
        expect(bankService.deposit).toHaveBeenCalledWith(bankAddress, amount)
        expect(error.value).toBe(null)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(bankService.deposit).mockRejectedValue(mockError)
      })

      it('should keeps state of transaction to be null', async () => {
        const { execute: deposit, transaction } = useBankDeposit()
        expect(transaction.value).toBe(undefined)
        await deposit(bankAddress, amount)
        expect(bankService.deposit).toHaveBeenCalledWith(bankAddress, amount)
        expect(transaction.value).toBe(undefined)
      })

      it('should change state of isLoading correctly', async () => {
        const { execute: deposit, isLoading } = useBankDeposit()
        const promise = deposit(bankAddress, amount)
        expect(bankService.deposit).toHaveBeenCalledWith(bankAddress, amount)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })

      it('should keeps state of isSuccess to be false', async () => {
        const { execute: deposit, isSuccess } = useBankDeposit()
        expect(isSuccess.value).toBe(false)
        await deposit(bankAddress, amount)
        expect(bankService.deposit).toHaveBeenCalledWith(bankAddress, amount)
        expect(isSuccess.value).toBe(false)
      })

      it('should change state of error correctly', async () => {
        const { execute: deposit, error } = useBankDeposit()
        expect(error.value).toBe(null)
        await deposit(bankAddress, amount)
        expect(bankService.deposit).toHaveBeenCalledWith(bankAddress, amount)
        expect(error.value).toBe(mockError)
      })
    })
  })

  describe('useBankTransfer', () => {
    it('should set initial values correctly', async () => {
      const { execute: transfer, isLoading, error, transaction, isSuccess } = useBankTransfer()
      expect(transfer).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(transaction.value).toBe(undefined)
      expect(error.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of transaction correctly', async () => {
        const { execute: transfer, transaction } = useBankTransfer()
        expect(transaction.value).toBe(undefined)
        await transfer(bankAddress, to, amount)
        expect(bankService.transfer).toHaveBeenCalledWith(bankAddress, to, amount)
        expect(transaction.value).not.toBe(tx)
      })

      it('should change state of isLoading correctly', async () => {
        const { execute: transfer, isLoading } = useBankTransfer()
        const promise = transfer(bankAddress, to, amount)
        expect(bankService.transfer).toHaveBeenCalledWith(bankAddress, to, amount)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })

      it('should change state of isSuccess correctly', async () => {
        const { execute: transfer, isSuccess } = useBankTransfer()
        expect(isSuccess.value).toBe(false)
        await transfer(bankAddress, to, amount)
        expect(bankService.transfer).toHaveBeenCalledWith(bankAddress, to, amount)
        expect(isSuccess.value).toBe(true)
      })

      it('should keeps state of error', async () => {
        const { execute: transfer, error } = useBankTransfer()
        expect(error.value).toBe(null)
        await transfer(bankAddress, to, amount)
        expect(bankService.transfer).toHaveBeenCalledWith(bankAddress, to, amount)
        expect(error.value).toBe(null)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(bankService.transfer).mockRejectedValue(mockError)
      })

      it('should change state of transaction correctly', async () => {
        const { execute: transfer, transaction } = useBankTransfer()
        expect(transaction.value).toBe(undefined)
        await transfer(bankAddress, to, amount)
        expect(bankService.transfer).toHaveBeenCalledWith(bankAddress, to, amount)
        expect(transaction.value).toBe(undefined)
      })

      it('should change state of isLoading correctly', async () => {
        const { execute: transfer, isLoading } = useBankTransfer()
        const promise = transfer(bankAddress, to, amount)
        expect(bankService.transfer).toHaveBeenCalledWith(bankAddress, to, amount)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })

      it('should keeps state of isSuccess to false', async () => {
        const { execute: transfer, isSuccess } = useBankTransfer()
        expect(isSuccess.value).toBe(false)
        await transfer(bankAddress, to, amount)
        expect(bankService.transfer).toHaveBeenCalledWith(bankAddress, to, amount)
        expect(isSuccess.value).toBe(false)
      })

      it('should change state of error correctly', async () => {
        const { execute: transfer, error } = useBankTransfer()
        expect(error.value).toBe(null)
        await transfer(bankAddress, to, amount)
        expect(bankService.transfer).toHaveBeenCalledWith(bankAddress, to, amount)
        expect(error.value).toBe(mockError)
      })
    })
  })

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

  describe('useBankPause', () => {
    it('should set initial values correctly', async () => {
      const { execute: pause, isLoading, error, transaction, isSuccess } = useBankPause(bankAddress)
      expect(pause).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(transaction.value).toBe(null)
      expect(error.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of transaction correctly', async () => {
        const { execute: pause, transaction } = useBankPause(bankAddress)
        expect(transaction.value).toBe(null)
        await pause()
        expect(bankService.pause).toHaveBeenCalledWith(bankAddress)
        expect(transaction.value).not.toBe(tx)
      })

      it('should change state of isLoading correctly', async () => {
        const { execute: pause, isLoading } = useBankPause(bankAddress)
        const promise = pause()
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })

      it('should change state of isSuccess correctly', async () => {
        const { execute: pause, isSuccess } = useBankPause(bankAddress)
        expect(isSuccess.value).toBe(false)
        await pause()
        expect(bankService.pause).toHaveBeenCalledWith(bankAddress)
        expect(isSuccess.value).toBe(true)
      })

      it('should keeps state of error', async () => {
        const { execute: pause, error } = useBankPause(bankAddress)
        expect(error.value).toBe(null)
        await pause()
        expect(bankService.pause).toHaveBeenCalledWith(bankAddress)
        expect(error.value).toBe(null)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(bankService.pause).mockRejectedValue(mockError)
      })

      it('should change state of transaction correctly', async () => {
        const { execute: pause, transaction } = useBankPause(bankAddress)
        expect(transaction.value).toBe(null)
        await pause()
        expect(bankService.pause).toHaveBeenCalledWith(bankAddress)
        expect(transaction.value).toBe(null)
      })

      it('should change state of isLoading correctly', async () => {
        const { execute: pause, isLoading } = useBankPause(bankAddress)
        const promise = pause()
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })

      it('should keeps state of isSuccess to be false', async () => {
        const { execute: pause, isSuccess } = useBankPause(bankAddress)
        expect(isSuccess.value).toBe(false)
        await pause()
        expect(bankService.pause).toHaveBeenCalledWith(bankAddress)
        expect(isSuccess.value).toBe(false)
      })

      it('should change state of error correctly', async () => {
        const { execute: pause, error } = useBankPause(bankAddress)
        expect(error.value).toBe(null)
        await pause()
        expect(bankService.pause).toHaveBeenCalledWith(bankAddress)
        expect(error.value).toBe(mockError)
      })
    })
  })

  describe('useBankUnpause', () => {
    it('should set initial values correctly', async () => {
      const {
        execute: unpause,
        isLoading,
        error,
        transaction,
        isSuccess
      } = useBankUnpause(bankAddress)
      expect(unpause).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(transaction.value).toBe(null)
      expect(error.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of transaction correctly', async () => {
        const { execute: unpause, transaction } = useBankUnpause(bankAddress)
        expect(transaction.value).toBe(null)
        await unpause()
        expect(bankService.unpause).toHaveBeenCalledWith(bankAddress)
        expect(transaction.value).not.toBe(tx)
      })

      it('should change state of isLoading correctly', async () => {
        const { execute: unpause, isLoading } = useBankUnpause(bankAddress)
        const promise = unpause()
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })

      it('should change state of isSuccess correctly', async () => {
        const { execute: unpause, isSuccess } = useBankUnpause(bankAddress)
        expect(isSuccess.value).toBe(false)
        await unpause()
        expect(bankService.unpause).toHaveBeenCalledWith(bankAddress)
        expect(isSuccess.value).toBe(true)
      })

      it('should keeps state of error', async () => {
        const { execute: unpause, error } = useBankUnpause(bankAddress)
        expect(error.value).toBe(null)
        await unpause()
        expect(bankService.unpause).toHaveBeenCalledWith(bankAddress)
        expect(error.value).toBe(null)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(bankService.unpause).mockRejectedValue(mockError)
      })

      it('should change state of transaction correctly', async () => {
        const { execute: unpause, transaction } = useBankUnpause(bankAddress)
        expect(transaction.value).toBe(null)
        await unpause()
        expect(bankService.unpause).toHaveBeenCalledWith(bankAddress)
        expect(transaction.value).toBe(null)
      })

      it('should change state of isLoading correctly', async () => {
        const { execute: unpause, isLoading } = useBankUnpause(bankAddress)
        const promise = unpause()
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })

      it('should keeps state of isSuccess to be false', async () => {
        const { execute: unpause, isSuccess } = useBankUnpause(bankAddress)
        expect(isSuccess.value).toBe(false)
        await unpause()
        expect(bankService.unpause).toHaveBeenCalledWith(bankAddress)
        expect(isSuccess.value).toBe(false)
      })

      it('should change state of error correctly', async () => {
        const { execute: unpause, error } = useBankUnpause(bankAddress)
        expect(error.value).toBe(null)
        await unpause()
        expect(bankService.unpause).toHaveBeenCalledWith(bankAddress)
        expect(error.value).toBe(mockError)
      })
    })
  })

  describe('useBankTransferOwnership', () => {
    it('should set initial values correctly', async () => {
      const {
        execute: transferOwnership,
        isLoading,
        error,
        transaction,
        isSuccess
      } = useBankTransferOwnership(bankAddress)
      expect(transferOwnership).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(transaction.value).toBe(null)
      expect(error.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of transaction correctly', async () => {
        const { execute: transferOwnership, transaction } = useBankTransferOwnership(bankAddress)
        expect(transaction.value).toBe(null)
        await transferOwnership(to)
        expect(bankService.transferOwnership).toHaveBeenCalledWith(bankAddress, to)
        expect(transaction.value).not.toBe(tx)
      })

      it('should change state of isLoading correctly', async () => {
        const { execute: transferOwnership, isLoading } = useBankTransferOwnership(bankAddress)
        const promise = transferOwnership(to)
        expect(bankService.transferOwnership).toHaveBeenCalledWith(bankAddress, to)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })

      it('should change state of isSuccess correctly', async () => {
        const { execute: transferOwnership, isSuccess } = useBankTransferOwnership(bankAddress)
        expect(isSuccess.value).toBe(false)
        await transferOwnership(to)
        expect(bankService.transferOwnership).toHaveBeenCalledWith(bankAddress, to)
        expect(isSuccess.value).toBe(true)
      })

      it('should keeps state of error', async () => {
        const { execute: transferOwnership, error } = useBankTransferOwnership(bankAddress)
        expect(error.value).toBe(null)
        await transferOwnership(to)
        expect(bankService.transferOwnership).toHaveBeenCalledWith(bankAddress, to)
        expect(error.value).toBe(null)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(bankService.transferOwnership).mockRejectedValue(mockError)
      })

      it('should change state of transaction correctly', async () => {
        const { execute: transferOwnership, transaction } = useBankTransferOwnership(bankAddress)
        expect(transaction.value).toBe(null)
        await transferOwnership(to)
        expect(bankService.transferOwnership).toHaveBeenCalledWith(bankAddress, to)
        expect(transaction.value).toBe(null)
      })

      it('should change state of isLoading correctly', async () => {
        const { execute: transferOwnership, isLoading } = useBankTransferOwnership(bankAddress)
        const promise = transferOwnership(to)
        expect(bankService.transferOwnership).toHaveBeenCalledWith(bankAddress, to)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })

      it('should keeps state of isSuccess to be false', async () => {
        const { execute: transferOwnership, isSuccess } = useBankTransferOwnership(bankAddress)
        expect(isSuccess.value).toBe(false)
        await transferOwnership(to)
        expect(bankService.transferOwnership).toHaveBeenCalledWith(bankAddress, to)
        expect(isSuccess.value).toBe(false)
      })

      it('should change state of error correctly', async () => {
        const { execute: transferOwnership, error } = useBankTransferOwnership(bankAddress)
        expect(error.value).toBe(null)
        await transferOwnership(to)
        expect(bankService.transferOwnership).toHaveBeenCalledWith(bankAddress, to)
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

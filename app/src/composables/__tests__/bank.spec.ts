import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useBankBalance,
  useBankDeposit,
  useBankEvents,
  useBankTransfer,
  useDeployBankContract
} from '../bank'
import { BankEventType, type EventResult } from '@/types'
import type { Result } from 'ethers'

// mock web3Util
vi.mock('@/utils/web3Util')

// mock BankService
const teamId = '1'
const amount = '1'
const to = '0x123'

const mockEventResults = [
  {
    txHash: '0x1',
    data: ['0xDepositor1', '1000000000000000000'] as Result, // 1 ETH
    date: '01/01/2022 00:00'
  }
]

const { bankBalance, bankAddress, tx, mockEvents } = vi.hoisted(() => {
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
    ]
  }
})

const { bankService } = vi.hoisted(() => {
  return {
    bankService: {
      createBankContract: vi.fn().mockReturnValue(Promise.resolve(bankAddress)),
      deposit: vi.fn().mockReturnValue(Promise.resolve(tx)),
      transfer: vi.fn().mockReturnValue(Promise.resolve(tx)),
      getEvents: vi.fn().mockReturnValue(Promise.resolve(mockEvents)),
      getContract: vi.fn().mockImplementation(() => {
        return {
          address: bankAddress,
          interface: {
            decodeEventLog: vi.fn().mockReturnValue(mockEventResults[0].data)
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
  describe('useDeployBankContract', () => {
    it('should set initial values correctly', async () => {
      const {
        execute: deploy,
        isLoading,
        isSuccess,
        error,
        contractAddress
      } = useDeployBankContract()
      expect(deploy).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value).toBe(null)
      expect(contractAddress.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of loading correctly', async () => {
        const { execute: deploy, isLoading } = useDeployBankContract()
        const promise = deploy(teamId)
        expect(bankService.createBankContract).toHaveBeenCalledWith(teamId)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })

      it('should change state of isSuccess correctly', async () => {
        const { execute: deploy, isSuccess } = useDeployBankContract()
        const promise = deploy(teamId)
        expect(bankService.createBankContract).toHaveBeenCalledWith(teamId)
        expect(isSuccess.value).toBe(false)
        await promise
        expect(isSuccess.value).toBe(true)
      })

      it('should keeps the state of error', async () => {
        const { execute: deploy, error } = useDeployBankContract()
        const promise = deploy(teamId)
        expect(bankService.createBankContract).toHaveBeenCalledWith(teamId)
        expect(error.value).toBe(null)
        await promise
        expect(error.value).toBe(null)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(bankService.createBankContract).mockRejectedValue(mockError)
      })

      it('should change state of error correctly', async () => {
        const { execute: deploy, error } = useDeployBankContract()
        expect(error.value).toBe(null)
        await deploy(teamId)
        expect(bankService.createBankContract).toHaveBeenCalledWith(teamId)
        expect(error.value).toBe(mockError)
      })

      it('should keeps the state of isSuccess to false', async () => {
        const { execute: deploy, isSuccess } = useDeployBankContract()
        expect(isSuccess.value).toBe(false)
        await deploy(teamId)
        expect(bankService.createBankContract).toHaveBeenCalledWith(teamId)
        expect(isSuccess.value).toBe(false)
      })

      it('should change state of isLoading correctly', async () => {
        const { execute: deploy, isLoading } = useDeployBankContract()
        const promise = deploy(teamId)
        expect(bankService.createBankContract).toHaveBeenCalledWith(teamId)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
    })
  })

  describe('useBankBalance', () => {
    it('should set initial values correctly', async () => {
      const { execute: getBalance, isLoading, error, data: balance } = useBankBalance()
      expect(getBalance).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBe(null)
      expect(balance.value).toBe(null)
    })

    describe('when success', () => {
      beforeEach(() => {
        vi.mocked(bankService.web3Library.getBalance).mockReturnValue(bankBalance)
      })

      it('should change state of isLoading correctly', async () => {
        const { execute: getBalance, isLoading } = useBankBalance()
        const promise = getBalance(bankAddress)
        expect(bankService.web3Library.getBalance).toHaveBeenCalledWith(bankAddress)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })

      it('should keeps the state of error', async () => {
        const { execute: getBalance, error } = useBankBalance()
        expect(error.value).toBe(null)
        await getBalance(bankAddress)
        expect(bankService.web3Library.getBalance).toHaveBeenCalledWith(bankAddress)
        expect(error.value).toBe(null)
      })

      it('should change state of balance correctly', async () => {
        const { execute: getBalance, data: balance } = useBankBalance()
        expect(balance.value).toBe(null)
        await getBalance(bankAddress)
        expect(bankService.web3Library.getBalance).toHaveBeenCalledWith(bankAddress)
        expect(balance.value).toBe(bankBalance)
      })
    })

    describe('when error ', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(bankService.web3Library.getBalance).mockRejectedValue(mockError)
      })

      it('should change state of error correctly', async () => {
        const { execute: getBalance, error } = useBankBalance()
        expect(error.value).toBe(null)
        await getBalance(bankAddress)
        expect(bankService.web3Library.getBalance).toHaveBeenCalledWith(bankAddress)
        expect(error.value).toBe(mockError)
      })

      it('should keeps state of balance to null', async () => {
        const { execute: getBalance, data: balance } = useBankBalance()
        expect(balance.value).toBe(null)
        await getBalance(bankAddress)
        expect(bankService.web3Library.getBalance).toHaveBeenCalledWith(bankAddress)
        expect(balance.value).toBe(null)
      })

      it('should keeps state of isLoading correctly', async () => {
        const { execute: getBalance, isLoading } = useBankBalance()
        const promise = getBalance(bankAddress)
        expect(bankService.web3Library.getBalance).toHaveBeenCalledWith(bankAddress)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
    })
  })

  describe('useBankDeposit', () => {
    it('should set initial values correctly', async () => {
      const { execute: deposit, isLoading, error, transaction, isSuccess } = useBankDeposit()
      expect(deposit).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(transaction.value).toBe(null)
      expect(error.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of transaction correctly', async () => {
        const { execute: deposit, transaction } = useBankDeposit()
        expect(transaction.value).toBe(null)
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
        expect(transaction.value).toBe(null)
        await deposit(bankAddress, amount)
        expect(bankService.deposit).toHaveBeenCalledWith(bankAddress, amount)
        expect(transaction.value).toBe(null)
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
      expect(transaction.value).toBe(null)
      expect(error.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of transaction correctly', async () => {
        const { execute: transfer, transaction } = useBankTransfer()
        expect(transaction.value).toBe(null)
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
        expect(transaction.value).toBe(null)
        await transfer(bankAddress, to, amount)
        expect(bankService.transfer).toHaveBeenCalledWith(bankAddress, to, amount)
        expect(transaction.value).toBe(null)
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
})

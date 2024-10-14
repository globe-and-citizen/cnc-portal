import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useDeployExpenseAccountContract,
  useExpenseAccountGetBalance,
  useExpenseAccountGetOwner,
  useExpenseAccountGetMaxLimit,
  useExpenseAccountSetLimit,
  useExpenseAccountApproveAddress,
  useExpenseAccountDisapproveAddress,
  useExpenseAccountIsApprovedAddress,
  useExpenseAccountTransfer,
  useExpenseAccountTransferOwnership,
  useExpenseGetFunction
} from '../useExpenseAccount'
//import { ExpenseAccountEventType, type EventResult } from '@/types'
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

// mock expenseAccountService
const amount = '1'
const to = '0x123'

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
  expenseAccountUser,
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
  describe('useDeployExpenseAccountContract', () => {
    it('should set initial values correctly', () => {
      const {
        execute: deploy,
        isLoading,
        isSuccess,
        error,
        data: contractAddress
      } = useDeployExpenseAccountContract()
      expect(deploy).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value).toBe(null)
      expect(contractAddress.value).toBe(null)
    })
    describe('when success', () => {
      it('should change state of loading correctly', async () => {
        const { execute: deploy, isLoading } = useDeployExpenseAccountContract()
        const promise = deploy()
        expect(expenseAccountService.createExpenseAccountContract).toHaveBeenCalled()
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
      it('should change state of isSuccess correctly', async () => {
        const { execute: deploy, isSuccess } = useDeployExpenseAccountContract()
        const promise = deploy()
        expect(expenseAccountService.createExpenseAccountContract).toHaveBeenCalled()
        expect(isSuccess.value).toBe(false)
        await promise
        expect(isSuccess.value).toBe(true)
      })
      it('should keep the state of error', async () => {
        const { execute: deploy, error } = useDeployExpenseAccountContract()
        const promise = deploy()
        expect(expenseAccountService.createExpenseAccountContract).toHaveBeenCalled()
        expect(error.value).toBe(null)
        await promise
        expect(error.value).toBe(null)
      })
      it('should change state of expense account address correctly', async () => {
        const { execute: deploy, data } = useDeployExpenseAccountContract()
        const promise = deploy()
        expect(expenseAccountService.createExpenseAccountContract).toHaveBeenCalledWith()
        expect(data.value).toBe(null)
        await promise
        expect(data.value).toBe('0x123')
      })
    })
    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(expenseAccountService.createExpenseAccountContract).mockRejectedValue(mockError)
      })

      it('should change state of error correctly', async () => {
        const { execute: deploy, error } = useDeployExpenseAccountContract()
        expect(error.value).toBe(null)
        await deploy()
        expect(expenseAccountService.createExpenseAccountContract).toHaveBeenCalled()
        expect(error.value).toBe(mockError)
      })

      it('should keep the state of isSuccess to false', async () => {
        const { execute: deploy, isSuccess } = useDeployExpenseAccountContract()
        expect(isSuccess.value).toBe(false)
        await deploy()
        expect(expenseAccountService.createExpenseAccountContract).toHaveBeenCalled()
        expect(isSuccess.value).toBe(false)
      })

      it('should change state of isLoading correctly', async () => {
        const { execute: deploy, isLoading } = useDeployExpenseAccountContract()
        const promise = deploy()
        expect(expenseAccountService.createExpenseAccountContract).toHaveBeenCalled()
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
    })
  })

  //useExpenseAccountGetBalance
  describe('useExpenseAccountGetBalance', async () => {
    it('should set initial values correctly', () => {
      const {
        execute: getBalance,
        isLoading,
        isSuccess,
        error,
        data: contractBalance
      } = useExpenseAccountGetBalance()
      expect(getBalance).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value).toBe(null)
      expect(contractBalance.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of isLoading correctly', async () => {
        const { execute: getBalance, isLoading } = useExpenseAccountGetBalance()
        const promise = getBalance(expenseAccountAddress)
        expect(expenseAccountService.getBalance).toHaveBeenCalledWith(expenseAccountAddress)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
      it('should change state of isSuccess correctly', async () => {
        const { execute: getBalance, isSuccess } = useExpenseAccountGetBalance()
        const promise = getBalance(expenseAccountAddress)
        expect(expenseAccountService.getBalance).toHaveBeenCalledWith(expenseAccountAddress)
        expect(isSuccess.value).toBe(false)
        await promise
        expect(isSuccess.value).toBe(true)
      })
      it('should keep the state of error', async () => {
        const { execute: getBalance, error } = useExpenseAccountGetBalance()
        const promise = getBalance(expenseAccountAddress)
        expect(expenseAccountService.getBalance).toHaveBeenCalledWith(expenseAccountAddress)
        expect(error.value).toBe(null)
        await promise
        expect(error.value).toBe(null)
      })
      it('should change state of expense account balance correctly', async () => {
        const { execute: getBalance, data } = useExpenseAccountGetBalance()
        const promise = getBalance(expenseAccountAddress)
        expect(expenseAccountService.getBalance).toHaveBeenCalledWith(expenseAccountAddress)
        expect(data.value).toBe(null)
        await promise
        expect(data.value).toBe(expenseAccountBalance)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(expenseAccountService.getBalance).mockRejectedValue(mockError)
      })

      it('should change state of error correctly', async () => {
        const { execute: getBalance, error } = useExpenseAccountGetBalance()
        expect(error.value).toBe(null)
        await getBalance(expenseAccountAddress)
        expect(expenseAccountService.getBalance).toHaveBeenCalledWith(expenseAccountAddress)
        expect(error.value).toBe(mockError)
      })
      it('should keep the state of isSuccess to false', async () => {
        const { execute: getBalance, isSuccess } = useExpenseAccountGetBalance()
        expect(isSuccess.value).toBe(false)
        await getBalance(expenseAccountAddress)
        expect(expenseAccountService.getBalance).toHaveBeenCalledWith(expenseAccountAddress)
        expect(isSuccess.value).toBe(false)
      })
      it('should change state of isLoading correctly', async () => {
        const { execute: getBalance, isLoading } = useExpenseAccountGetBalance()
        const promise = getBalance(expenseAccountAddress)
        expect(expenseAccountService.getBalance).toHaveBeenCalledWith(expenseAccountAddress)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
    })
  })

  //useExpenseAccountGetOwner
  describe('useExpenseAccountGetOwner', async () => {
    it('should set initial values correctly', () => {
      const {
        execute: getOwner,
        isLoading,
        isSuccess,
        error,
        data: ownerAddress
      } = useExpenseAccountGetOwner()
      expect(getOwner).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value).toBe(null)
      expect(ownerAddress.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of isLoading correctly', async () => {
        const { execute: getOwner, isLoading } = useExpenseAccountGetOwner()
        const promise = getOwner(expenseAccountAddress)
        expect(expenseAccountService.getOwner).toHaveBeenCalledWith(expenseAccountAddress)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
      it('should change state of isSuccess correctly', async () => {
        const { execute: getOwner, isSuccess } = useExpenseAccountGetOwner()
        const promise = getOwner(expenseAccountAddress)
        expect(expenseAccountService.getOwner).toHaveBeenCalledWith(expenseAccountAddress)
        expect(isSuccess.value).toBe(false)
        await promise
        expect(isSuccess.value).toBe(true)
      })
      it('should keep the state of error', async () => {
        const { execute: getOwner, error } = useExpenseAccountGetOwner()
        const promise = getOwner(expenseAccountAddress)
        expect(expenseAccountService.getOwner).toHaveBeenCalledWith(expenseAccountAddress)
        expect(error.value).toBe(null)
        await promise
        expect(error.value).toBe(null)
      })
      it('should change state of expense account owner correctly', async () => {
        const { execute: getOwner, data } = useExpenseAccountGetOwner()
        const promise = getOwner(expenseAccountAddress)
        expect(expenseAccountService.getOwner).toHaveBeenCalledWith(expenseAccountAddress)
        expect(data.value).toBe(null)
        await promise
        expect(data.value).toBe(expenseAccountOwner)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(expenseAccountService.getOwner).mockRejectedValue(mockError)
      })

      it('should change state of error correctly', async () => {
        const { execute: getOwner, error } = useExpenseAccountGetOwner()
        expect(error.value).toBe(null)
        await getOwner(expenseAccountAddress)
        expect(expenseAccountService.getOwner).toHaveBeenCalledWith(expenseAccountAddress)
        expect(error.value).toBe(mockError)
      })
      it('should keep the state of isSuccess to false', async () => {
        const { execute: getOwner, isSuccess } = useExpenseAccountGetOwner()
        expect(isSuccess.value).toBe(false)
        await getOwner(expenseAccountAddress)
        expect(expenseAccountService.getOwner).toHaveBeenCalledWith(expenseAccountAddress)
        expect(isSuccess.value).toBe(false)
      })
      it('should change state of isLoading correctly', async () => {
        const { execute: getOwner, isLoading } = useExpenseAccountGetOwner()
        const promise = getOwner(expenseAccountAddress)
        expect(expenseAccountService.getOwner).toHaveBeenCalledWith(expenseAccountAddress)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
    })
  })

  // useExpenseAccountGetMaxLimit
  describe('useExpenseAccountGetMaxLimit', () => {
    it('should set initial values correctly', () => {
      const {
        execute: getMaxLimit,
        isLoading,
        isSuccess,
        error,
        data: maxLimit
      } = useExpenseAccountGetMaxLimit()
      expect(getMaxLimit).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value).toBe(null)
      expect(maxLimit.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of isLoading correctly', async () => {
        const { execute: getMaxLimit, isLoading } = useExpenseAccountGetMaxLimit()
        const promise = getMaxLimit(expenseAccountAddress)
        expect(expenseAccountService.getMaxLimit).toHaveBeenCalledWith(expenseAccountAddress)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
      it('should change state of isSuccess correctly', async () => {
        const { execute: getMaxLimit, isSuccess } = useExpenseAccountGetMaxLimit()
        const promise = getMaxLimit(expenseAccountAddress)
        expect(expenseAccountService.getMaxLimit).toHaveBeenCalledWith(expenseAccountAddress)
        expect(isSuccess.value).toBe(false)
        await promise
        expect(isSuccess.value).toBe(true)
      })
      it('should keep the state of error', async () => {
        const { execute: getMaxLimit, error } = useExpenseAccountGetMaxLimit()
        const promise = getMaxLimit(expenseAccountAddress)
        expect(expenseAccountService.getMaxLimit).toHaveBeenCalledWith(expenseAccountAddress)
        expect(error.value).toBe(null)
        await promise
        expect(error.value).toBe(null)
      })
      it('should change state of expense account max limit correctly', async () => {
        const { execute: getMaxLimit, data } = useExpenseAccountGetMaxLimit()
        const promise = getMaxLimit(expenseAccountAddress)
        expect(expenseAccountService.getMaxLimit).toHaveBeenCalledWith(expenseAccountAddress)
        expect(data.value).toBe(null)
        await promise
        expect(data.value).toBe(expenseAccountMaxLimit)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(expenseAccountService.getMaxLimit).mockRejectedValue(mockError)
      })

      it('should change state of error correctly', async () => {
        const { execute: getMaxLimit, error } = useExpenseAccountGetMaxLimit()
        expect(error.value).toBe(null)
        await getMaxLimit(expenseAccountAddress)
        expect(expenseAccountService.getMaxLimit).toHaveBeenCalledWith(expenseAccountAddress)
        expect(error.value).toBe(mockError)
      })
      it('should keep the state of isSuccess to false', async () => {
        const { execute: getMaxLimit, isSuccess } = useExpenseAccountGetMaxLimit()
        expect(isSuccess.value).toBe(false)
        await getMaxLimit(expenseAccountAddress)
        expect(expenseAccountService.getMaxLimit).toHaveBeenCalledWith(expenseAccountAddress)
        expect(isSuccess.value).toBe(false)
      })
      it('should change state of isLoading correctly', async () => {
        const { execute: getMaxLimit, isLoading } = useExpenseAccountGetMaxLimit()
        const promise = getMaxLimit(expenseAccountAddress)
        expect(expenseAccountService.getMaxLimit).toHaveBeenCalledWith(expenseAccountAddress)
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
    })
  })

  // useExpenseAccountSetMaxLimt
  describe('useExpenseAccountSetMaxLimt', () => {
    it('should set initial values correctly', () => {
      const {
        execute: setMaxLimit,
        isLoading,
        isSuccess,
        error,
        data: _tx
      } = useExpenseAccountSetLimit()
      expect(setMaxLimit).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value).toBe(null)
      expect(_tx.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of isLoading correctly', async () => {
        const { execute: setMaxLimit, isLoading } = useExpenseAccountSetLimit()
        const promise = setMaxLimit(expenseAccountAddress, expenseAccountMaxLimit)
        expect(expenseAccountService.setMaxLimit).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountMaxLimit
        )
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
      it('should change state of isSuccess correctly', async () => {
        const { execute: setMaxLimit, isSuccess } = useExpenseAccountSetLimit()
        const promise = setMaxLimit(expenseAccountAddress, expenseAccountMaxLimit)
        expect(expenseAccountService.setMaxLimit).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountMaxLimit
        )
        expect(isSuccess.value).toBe(false)
        await promise
        expect(isSuccess.value).toBe(true)
      })
      it('should keep the state of error', async () => {
        const { execute: setMaxLimit, error } = useExpenseAccountSetLimit()
        const promise = setMaxLimit(expenseAccountAddress, expenseAccountMaxLimit)
        expect(expenseAccountService.setMaxLimit).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountMaxLimit
        )
        expect(error.value).toBe(null)
        await promise
        expect(error.value).toBe(null)
      })
      it('should change state of set max limit data correctly', async () => {
        const { execute: setMaxLimit, data } = useExpenseAccountSetLimit()
        const promise = setMaxLimit(expenseAccountAddress, expenseAccountMaxLimit)
        expect(expenseAccountService.setMaxLimit).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountMaxLimit
        )
        expect(data.value).toBe(null)
        await promise
        expect(data.value).toStrictEqual(tx)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(expenseAccountService.setMaxLimit).mockRejectedValue(mockError)
      })

      it('should change state of error correctly', async () => {
        const { execute: setMaxLimit, error } = useExpenseAccountSetLimit()
        expect(error.value).toBe(null)
        await setMaxLimit(expenseAccountAddress, expenseAccountMaxLimit)
        expect(expenseAccountService.setMaxLimit).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountMaxLimit
        )
        expect(error.value).toBe(mockError)
      })
      it('should keep the state of isSuccess to false', async () => {
        const { execute: setMaxLimit, isSuccess } = useExpenseAccountSetLimit()
        expect(isSuccess.value).toBe(false)
        await setMaxLimit(expenseAccountAddress, expenseAccountMaxLimit)
        expect(expenseAccountService.setMaxLimit).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountMaxLimit
        )
        expect(isSuccess.value).toBe(false)
      })
      it('should change state of isLoading correctly', async () => {
        const { execute: setMaxLimit, isLoading } = useExpenseAccountSetLimit()
        const promise = setMaxLimit(expenseAccountAddress, expenseAccountMaxLimit)
        expect(expenseAccountService.setMaxLimit).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountMaxLimit
        )
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
    })
  })

  // useExpenseAccountApproveAddress
  describe('useExpenseAccountApprovedAddress', () => {
    it('should set initial values correctly', () => {
      const {
        execute: approveAddress,
        isLoading,
        isSuccess,
        error,
        data: _tx
      } = useExpenseAccountApproveAddress()
      expect(approveAddress).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value).toBe(null)
      expect(_tx.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of isLoading correctly', async () => {
        const { execute: approveAddress, isLoading } = useExpenseAccountApproveAddress()
        const promise = approveAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.approveAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
      it('should change state of isSuccess correctly', async () => {
        const { execute: approveAddress, isSuccess } = useExpenseAccountApproveAddress()
        const promise = approveAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.approveAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(isSuccess.value).toBe(false)
        await promise
        expect(isSuccess.value).toBe(true)
      })
      it('should keep the state of error', async () => {
        const { execute: approveAddress, error } = useExpenseAccountApproveAddress()
        const promise = approveAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.approveAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(error.value).toBe(null)
        await promise
        expect(error.value).toBe(null)
      })
      it('should change state of approve user data correctly', async () => {
        const { execute: approveAddress, data } = useExpenseAccountApproveAddress()
        const promise = approveAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.approveAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(data.value).toBe(null)
        await promise
        expect(data.value).toStrictEqual(tx)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(expenseAccountService.approveAddress).mockRejectedValue(mockError)
      })

      it('should change state of error correctly', async () => {
        const { execute: approveAddress, error } = useExpenseAccountApproveAddress()
        expect(error.value).toBe(null)
        await approveAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.approveAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(error.value).toBe(mockError)
      })
      it('should keep the state of isSuccess to false', async () => {
        const { execute: approveAddress, isSuccess } = useExpenseAccountApproveAddress()
        expect(isSuccess.value).toBe(false)
        await approveAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.approveAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(isSuccess.value).toBe(false)
      })
      it('should change state of isLoading correctly', async () => {
        const { execute: approveAddress, isLoading } = useExpenseAccountApproveAddress()
        const promise = approveAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.approveAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
    })
  })

  // useExpenseAccountApproveAddress
  describe('useExpenseAccountApprovedAddress', () => {
    it('should set initial values correctly', () => {
      const {
        execute: disapproveAddress,
        isLoading,
        isSuccess,
        error,
        data: _tx
      } = useExpenseAccountDisapproveAddress()
      expect(disapproveAddress).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value).toBe(null)
      expect(_tx.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of isLoading correctly', async () => {
        const { execute: disapproveAddress, isLoading } = useExpenseAccountDisapproveAddress()
        const promise = disapproveAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.approveAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
      it('should change state of isSuccess correctly', async () => {
        const { execute: disapproveAddress, isSuccess } = useExpenseAccountDisapproveAddress()
        const promise = disapproveAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.disapproveAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(isSuccess.value).toBe(false)
        await promise
        expect(isSuccess.value).toBe(true)
      })
      it('should keep the state of error', async () => {
        const { execute: disapproveAddress, error } = useExpenseAccountDisapproveAddress()
        const promise = disapproveAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.disapproveAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(error.value).toBe(null)
        await promise
        expect(error.value).toBe(null)
      })
      it('should change state of disapprove user data correctly', async () => {
        const { execute: disapproveAddress, data } = useExpenseAccountDisapproveAddress()
        const promise = disapproveAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.approveAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(data.value).toBe(null)
        await promise
        expect(data.value).toStrictEqual(tx)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(expenseAccountService.disapproveAddress).mockRejectedValue(mockError)
      })

      it('should change state of error correctly', async () => {
        const { execute: disapproveAddress, error } = useExpenseAccountDisapproveAddress()
        expect(error.value).toBe(null)
        await disapproveAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.disapproveAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(error.value).toBe(mockError)
      })
      it('should keep the state of isSuccess to false', async () => {
        const { execute: disapproveAddress, isSuccess } = useExpenseAccountDisapproveAddress()
        expect(isSuccess.value).toBe(false)
        await disapproveAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.disapproveAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(isSuccess.value).toBe(false)
      })
      it('should change state of isLoading correctly', async () => {
        const { execute: disapproveAddress, isLoading } = useExpenseAccountDisapproveAddress()
        const promise = disapproveAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.disapproveAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
    })
  })

  // useExpenseAccountIsApproveAddress
  describe('useExpenseAccountIsApprovedAddress', () => {
    it('should set initial values correctly', () => {
      const {
        execute: isApprovedAddress,
        isLoading,
        isSuccess,
        error,
        data: result
      } = useExpenseAccountIsApprovedAddress()
      expect(isApprovedAddress).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value).toBe(null)
      expect(result.value).toBe(false)
    })

    describe('when success', () => {
      it('should change state of isLoading correctly', async () => {
        const { execute: isApprovedAddress, isLoading } = useExpenseAccountIsApprovedAddress()
        const promise = isApprovedAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.isApprovedAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
      it('should change state of isSuccess correctly', async () => {
        const { execute: isApprovedAddress, isSuccess } = useExpenseAccountIsApprovedAddress()
        const promise = isApprovedAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.isApprovedAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(isSuccess.value).toBe(false)
        await promise
        expect(isSuccess.value).toBe(true)
      })
      it('should keep the state of error', async () => {
        const { execute: isApprovedAddress, error } = useExpenseAccountIsApprovedAddress()
        const promise = isApprovedAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.isApprovedAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(error.value).toBe(null)
        await promise
        expect(error.value).toBe(null)
      })
      it('should change state of is address approved data correctly', async () => {
        const { execute: isApprovedAddress, data } = useExpenseAccountIsApprovedAddress()
        const promise = isApprovedAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.isApprovedAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(data.value).toBe(false)
        await promise
        expect(data.value).toStrictEqual(true)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(expenseAccountService.isApprovedAddress).mockRejectedValue(mockError)
      })

      it('should change state of error correctly', async () => {
        const { execute: isApprovedAddress, error } = useExpenseAccountIsApprovedAddress()
        expect(error.value).toBe(null)
        await isApprovedAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.isApprovedAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(error.value).toBe(mockError)
      })
      it('should keep the state of isSuccess to false', async () => {
        const { execute: isApprovedAddress, isSuccess } = useExpenseAccountIsApprovedAddress()
        expect(isSuccess.value).toBe(false)
        await isApprovedAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.isApprovedAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(isSuccess.value).toBe(false)
      })
      it('should change state of isLoading correctly', async () => {
        const { execute: isApprovedAddress, isLoading } = useExpenseAccountIsApprovedAddress()
        const promise = isApprovedAddress(expenseAccountAddress, expenseAccountUser)
        expect(expenseAccountService.isApprovedAddress).toHaveBeenCalledWith(
          expenseAccountAddress,
          expenseAccountUser
        )
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
    })
  })

  // useExpenseAccountTransfer
  describe('useExpenseAccountTransfer', () => {
    it('should set initial values correctly', () => {
      const {
        execute: transfer,
        isLoading,
        isSuccess,
        error,
        data: result
      } = useExpenseAccountTransfer()
      expect(transfer).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value).toBe(null)
      expect(result.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of isLoading correctly', async () => {
        const { execute: transfer, isLoading } = useExpenseAccountTransfer()
        const promise = transfer(expenseAccountAddress, to, amount)
        expect(expenseAccountService.transfer).toHaveBeenCalledWith(
          expenseAccountAddress,
          to,
          Number(amount)
        )
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
      it('should change state of isSuccess correctly', async () => {
        const { execute: transfer, isSuccess } = useExpenseAccountTransfer()
        const promise = transfer(expenseAccountAddress, to, amount)
        expect(expenseAccountService.transfer).toHaveBeenCalledWith(
          expenseAccountAddress,
          to,
          Number(amount)
        )
        expect(isSuccess.value).toBe(false)
        await promise
        expect(isSuccess.value).toBe(true)
      })
      it('should keep the state of error', async () => {
        const { execute: transfer, error } = useExpenseAccountTransfer()
        const promise = transfer(expenseAccountAddress, to, amount)
        expect(expenseAccountService.transfer).toHaveBeenCalledWith(
          expenseAccountAddress,
          to,
          Number(amount)
        )
        expect(error.value).toBe(null)
        await promise
        expect(error.value).toBe(null)
      })
      it('should change state of transfer data correctly', async () => {
        const { execute: transfer, data } = useExpenseAccountTransfer()
        const promise = transfer(expenseAccountAddress, to, amount)
        expect(expenseAccountService.transfer).toHaveBeenCalledWith(
          expenseAccountAddress,
          to,
          Number(amount)
        )
        expect(data.value).toBe(null)
        await promise
        expect(data.value).toStrictEqual(tx)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(expenseAccountService.transfer).mockRejectedValue(mockError)
      })

      it('should change state of error correctly', async () => {
        const { execute: transfer, error } = useExpenseAccountTransfer()
        expect(error.value).toBe(null)
        await transfer(expenseAccountAddress, to, amount)
        expect(expenseAccountService.transfer).toHaveBeenCalledWith(
          expenseAccountAddress,
          to,
          Number(amount)
        )
        expect(error.value).toBe(mockError)
      })
      it('should keep the state of isSuccess to false', async () => {
        const { execute: transfer, isSuccess } = useExpenseAccountTransfer()
        expect(isSuccess.value).toBe(false)
        await transfer(expenseAccountAddress, to, amount)
        expect(expenseAccountService.transfer).toHaveBeenCalledWith(
          expenseAccountAddress,
          to,
          Number(amount)
        )
        expect(isSuccess.value).toBe(false)
      })
      it('should change state of isLoading correctly', async () => {
        const { execute: transfer, isLoading } = useExpenseAccountTransfer()
        const promise = transfer(expenseAccountAddress, to, amount)
        expect(expenseAccountService.transfer).toHaveBeenCalledWith(
          expenseAccountAddress,
          to,
          Number(amount)
        )
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
    })
  })

  // useExpenseAccountTransferOwnership
  describe('useExpenseAccountTransferOwnership', () => {
    it('should set initial values correctly', () => {
      const {
        execute: transferOwnership,
        isLoading,
        isSuccess,
        error,
        data: result
      } = useExpenseAccountTransferOwnership(expenseAccountAddress)
      expect(transferOwnership).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
      expect(error.value).toBe(null)
      expect(result.value).toBe(null)
    })

    describe('when success', () => {
      it('should change state of isLoading correctly', async () => {
        const { execute: transferOwnership, isLoading } =
          useExpenseAccountTransferOwnership(expenseAccountAddress)
        const promise = transferOwnership(`0xNewOwner`)
        expect(expenseAccountService.transferOwnership).toHaveBeenCalledWith(
          expenseAccountAddress,
          `0xNewOwner`
        )
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
      it('should change state of isSuccess correctly', async () => {
        const { execute: transferOwnership, isSuccess } =
          useExpenseAccountTransferOwnership(expenseAccountAddress)
        const promise = transferOwnership('0xNewOwner')
        expect(expenseAccountService.transferOwnership).toHaveBeenCalledWith(
          expenseAccountAddress,
          `0xNewOwner`
        )
        expect(isSuccess.value).toBe(false)
        await promise
        expect(isSuccess.value).toBe(true)
      })
      it('should keep the state of error', async () => {
        const { execute: transferOwnership, error } =
          useExpenseAccountTransferOwnership(expenseAccountAddress)
        const promise = transferOwnership('0xNewOwner')
        expect(expenseAccountService.transferOwnership).toHaveBeenCalledWith(
          expenseAccountAddress,
          `0xNewOwner`
        )
        expect(error.value).toBe(null)
        await promise
        expect(error.value).toBe(null)
      })
      it('should change state of transfer data correctly', async () => {
        const { execute: transferOwnership, data } =
          useExpenseAccountTransferOwnership(expenseAccountAddress)
        const promise = transferOwnership('0xNewOwner')
        expect(expenseAccountService.transferOwnership).toHaveBeenCalledWith(
          expenseAccountAddress,
          `0xNewOwner`
        )
        expect(data.value).toBe(null)
        await promise
        expect(data.value).toStrictEqual(tx)
      })
    })

    describe('when error', () => {
      const mockError = new Error('error')

      beforeEach(() => {
        vi.mocked(expenseAccountService.transferOwnership).mockRejectedValue(mockError)
      })

      it('should change state of error correctly', async () => {
        const { execute: transferOwnership, error } =
          useExpenseAccountTransferOwnership(expenseAccountAddress)
        expect(error.value).toBe(null)
        await transferOwnership(`0xNewOwner`)
        expect(expenseAccountService.transferOwnership).toHaveBeenCalledWith(
          expenseAccountAddress,
          `0xNewOwner`
        )
        expect(error.value).toBe(mockError)
      })
      it('should keep the state of isSuccess to false', async () => {
        const { execute: transferOwnership, isSuccess } =
          useExpenseAccountTransferOwnership(expenseAccountAddress)
        expect(isSuccess.value).toBe(false)
        await transferOwnership('0xNewOwner')
        expect(expenseAccountService.transferOwnership).toHaveBeenCalledWith(
          expenseAccountAddress,
          `0xNewOwner`
        )
        expect(isSuccess.value).toBe(false)
      })
      it('should change state of isLoading correctly', async () => {
        const { execute: transferOwnership, isLoading } =
          useExpenseAccountTransferOwnership(expenseAccountAddress)
        const promise = transferOwnership('0xNewOwner')
        expect(expenseAccountService.transferOwnership).toHaveBeenCalledWith(
          expenseAccountAddress,
          '0xNewOwner'
        )
        expect(isLoading.value).toBe(true)
        await promise
        expect(isLoading.value).toBe(false)
      })
    })
  })

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

import { describe, expect, it, vi } from 'vitest'
import { useBankGetFunction } from '../bank'
import BankABI from '@/artifacts/abi/bank.json'

// mock web3Util
vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    getContract: mockGetContract,
    decodeFunctionData: vi.fn().mockImplementation(() => {
      return {
        functionName: 'transfer',
        args: ['0x123', '1.0']
      }
    })
  }
})
const { mockLog, mockGetContract } = vi.hoisted(() => {
  return {
    mockLog: vi.fn(),
    mockGetContract: vi.fn().mockImplementation(() => {
      return {
        abi: BankABI
      }
    })
  }
})
vi.mock('@/utils', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    log: {
      error: mockLog
    }
  }
})

describe('Bank', () => {
  describe('useBankGetFunction', () => {
    it('should set initial values correctly', () => {
      const { execute: getFunction, data, inputs, args } = useBankGetFunction('0x1')

      expect(getFunction).toBeInstanceOf(Function)
      expect(data.value).toBe(undefined)
      expect(inputs.value).toStrictEqual([])
      expect(args.value).toStrictEqual([])
    })

    it('should returns data correctly', async () => {
      const { execute: getFunction, data, args, inputs } = useBankGetFunction('0x1')
      await getFunction('data')
      expect(data.value).toStrictEqual('transfer')
      expect(args.value).toStrictEqual(['0x123', '1.0'])
      expect(inputs.value).toStrictEqual(['_to', '_amount'])
    })

    it('logs error when getFunction fails', async () => {
      const { execute: getFunction } = useBankGetFunction('0x1')

      mockGetContract.mockRejectedValue(new Error('error'))
      await getFunction('data')
      expect(mockLog).toHaveBeenCalled()
    })
  })
})

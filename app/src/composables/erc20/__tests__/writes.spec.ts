import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useERC20ContractWrite,
  useERC20Transfer,
  useERC20TransferFrom
} from '../writes'
import { mockERC20Writes, resetERC20Mocks } from '@/tests/mocks'
import type { Address } from 'viem'

// Test constants
const MOCK_DATA = {
  contractAddress: '0x1234567890123456789012345678901234567890' as Address,
  to: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address,
  from: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address,
  spender: '0x9876543210987654321098765432109876543210' as Address,
  amount: BigInt('1000000000000000000'), // 1 token with 18 decimals
  largeAmount: BigInt('999999999999999999999999'),
  zeroAmount: BigInt(0)
} as const

describe('ERC20 Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetERC20Mocks()
  })

  describe('useERC20ContractWrite', () => {
    it('should return transfer mock when configured', () => {
      const options = {
        contractAddress: MOCK_DATA.contractAddress,
        functionName: 'transfer' as const,
        args: [MOCK_DATA.to, MOCK_DATA.amount]
      }

      const result = useERC20ContractWrite(options)

      expect(result).toBeDefined()
      expect(result.executeWrite).toBeDefined()
      expect(result.writeResult).toBeDefined()
      expect(result.receiptResult).toBeDefined()
    })

    it('should have proper mock interface structure', () => {
      const options = {
        contractAddress: MOCK_DATA.contractAddress,
        functionName: 'transfer' as const
      }

      const result = useERC20ContractWrite(options)

      expect(result.executeWrite).toBeInstanceOf(Function)
      expect(result.writeResult.data).toBeDefined()
      expect(result.receiptResult.data).toBeDefined()
    })
  })

  describe('useERC20Transfer', () => {
    it('should return transfer mock', () => {
      const result = useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.amount)

      expect(result).toBe(mockERC20Writes.transfer)
    })

    it('should have executeWrite function', () => {
      const result = useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.amount)

      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should handle zero amount', () => {
      const result = useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.zeroAmount)

      expect(result).toBe(mockERC20Writes.transfer)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should handle large amounts', () => {
      const result = useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.largeAmount)

      expect(result).toBe(mockERC20Writes.transfer)
    })

    it('should support successful write execution', async () => {
      mockERC20Writes.transfer.executeWrite.mockResolvedValue(undefined)
      const result = useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.amount)

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle write errors', async () => {
      const error = new Error('Transfer failed')
      mockERC20Writes.transfer.executeWrite.mockRejectedValue(error)
      const result = useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.amount)

      await expect(result.executeWrite()).rejects.toThrow('Transfer failed')
    })
  })

  describe('useERC20TransferFrom', () => {
    it('should return transferFrom mock', () => {
      const result = useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.amount
      )

      expect(result).toBe(mockERC20Writes.transferFrom)
    })

    it('should have executeWrite function', () => {
      const result = useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.amount
      )

      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should handle zero amount', () => {
      const result = useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.zeroAmount
      )

      expect(result).toBe(mockERC20Writes.transferFrom)
    })

    it('should handle large amounts', () => {
      const result = useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.largeAmount
      )

      expect(result).toBe(mockERC20Writes.transferFrom)
    })

    it('should support successful write execution', async () => {
      mockERC20Writes.transferFrom.executeWrite.mockResolvedValue(undefined)
      const result = useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.amount
      )

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle write errors', async () => {
      const error = new Error('TransferFrom failed')
      mockERC20Writes.transferFrom.executeWrite.mockRejectedValue(error)
      const result = useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.amount
      )

      await expect(result.executeWrite()).rejects.toThrow('TransferFrom failed')
    })
  })

  describe('Mock Behavior', () => {
    it('should return distinct mocks for different functions', () => {
      const transfer = useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.amount)
      const transferFrom = useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.amount
      )

      expect(transfer).toBe(mockERC20Writes.transfer)
      expect(transferFrom).toBe(mockERC20Writes.transferFrom)
      expect(transfer).not.toBe(transferFrom)
    })

    it('should support mock customization for error scenarios', async () => {
      const error = new Error('Gas estimation failed')
      mockERC20Writes.transfer.executeWrite.mockRejectedValue(error)

      const result = useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.amount)
      await expect(result.executeWrite()).rejects.toThrow('Gas estimation failed')
    })

    it('should reset mocks properly between tests', () => {
      // Set up error state
      mockERC20Writes.transfer.executeWrite.mockRejectedValue(new Error('Test'))
      mockERC20Writes.transferFrom.executeWrite.mockRejectedValue(new Error('Test'))

      // Reset
      resetERC20Mocks()

      // Verify reset
      expect(mockERC20Writes.transfer.executeWrite).not.toHaveBeenCalled()
      expect(mockERC20Writes.transferFrom.executeWrite).not.toHaveBeenCalled()
    })

    it('should have consistent interface for all write mocks', () => {
      const transfer = useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.amount)
      const transferFrom = useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.amount
      )

      // All write functions should have same structure
      expect(transfer).toHaveProperty('executeWrite')
      expect(transfer).toHaveProperty('writeResult')
      expect(transfer).toHaveProperty('receiptResult')

      expect(transferFrom).toHaveProperty('executeWrite')
      expect(transferFrom).toHaveProperty('writeResult')
      expect(transferFrom).toHaveProperty('receiptResult')
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useDepositToken,
  useAddTokenSupport,
  useRemoveTokenSupport,
  usePause,
  useUnpause,
  useTransferOwnership,
  useRenounceOwnership,
  useTransfer,
  useTransferToken,
  useClaimDividend,
  useClaimTokenDividend,
  useDepositDividends,
  useDepositTokenDividends,
  useSetInvestorAddress
} from '../writes'
import { mockBankWrites, resetContractMocks } from '@/tests/mocks'
import type { Address } from 'viem'

// Test constants
const MOCK_DATA = {
  tokenAddress: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address,
  userAddress: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address,
  amount: BigInt('1000000000000000000'),
  zeroAmount: BigInt(0),
  largeAmount: BigInt('999999999999999999999999'),
  tokenAmount: BigInt('1000000')
} as const

describe('Bank Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  describe('Token Operations', () => {
    it('should return deposit token mock', () => {
      const result = useDepositToken(MOCK_DATA.tokenAddress, MOCK_DATA.amount)
      expect(result).toBe(mockBankWrites.deposit)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should return add token support mock', () => {
      const result = useAddTokenSupport(MOCK_DATA.tokenAddress)
      expect(result).toBe(mockBankWrites.addTokenSupport)
    })

    it('should return remove token support mock', () => {
      const result = useRemoveTokenSupport(MOCK_DATA.tokenAddress)
      expect(result).toBe(mockBankWrites.removeTokenSupport)
    })

    it('should support successful token operations', async () => {
      mockBankWrites.deposit.executeWrite.mockResolvedValue(undefined)
      const result = useDepositToken(MOCK_DATA.tokenAddress, MOCK_DATA.amount)

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle zero amounts', () => {
      const result = useDepositToken(MOCK_DATA.tokenAddress, MOCK_DATA.zeroAmount)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should handle large amounts', () => {
      const result = useDepositToken(MOCK_DATA.tokenAddress, MOCK_DATA.largeAmount)
      expect(result).toBe(mockBankWrites.deposit)
    })
  })

  describe('Dividend Operations', () => {
    it('should return claim dividend mock', () => {
      const result = useClaimDividend()
      expect(result).toBe(mockBankWrites.claimDividend)
    })

    it('should return claim token dividend mock', () => {
      const result = useClaimTokenDividend(MOCK_DATA.tokenAddress)
      expect(result).toBe(mockBankWrites.claimTokenDividend)
    })

    it('should return deposit dividends mock', () => {
      const result = useDepositDividends(MOCK_DATA.amount, MOCK_DATA.userAddress)
      expect(result).toBe(mockBankWrites.depositDividends)
    })

    it('should return deposit token dividends mock', () => {
      const result = useDepositTokenDividends(
        MOCK_DATA.tokenAddress,
        MOCK_DATA.amount,
        MOCK_DATA.userAddress
      )
      expect(result).toBe(mockBankWrites.depositTokenDividends)
    })

    it('should support successful dividend claims', async () => {
      mockBankWrites.claimDividend.executeWrite.mockResolvedValue(undefined)
      const result = useClaimDividend()

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle dividend claim errors', async () => {
      const error = new Error('Claim failed')
      mockBankWrites.claimDividend.executeWrite.mockRejectedValue(error)

      const result = useClaimDividend()
      await expect(result.executeWrite()).rejects.toThrow('Claim failed')
    })
  })

  describe('Administrative Operations', () => {
    it('should return pause mock', () => {
      const result = usePause()
      expect(result).toBe(mockBankWrites.pause)
    })

    it('should return unpause mock', () => {
      const result = useUnpause()
      expect(result).toBe(mockBankWrites.unpause)
    })

    it('should return transfer ownership mock', () => {
      const result = useTransferOwnership(MOCK_DATA.userAddress)
      expect(result).toBe(mockBankWrites.transferOwnership)
    })

    it('should return renounce ownership mock', () => {
      const result = useRenounceOwnership()
      expect(result).toBe(mockBankWrites.renounceOwnership)
    })

    it('should return set investor address mock', () => {
      const result = useSetInvestorAddress(MOCK_DATA.userAddress)
      expect(result).toBe(mockBankWrites.setInvestorAddress)
    })

    it('should handle pause/unpause operations', async () => {
      mockBankWrites.pause.executeWrite.mockResolvedValue(undefined)
      const result = usePause()

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })
  })

  describe('Transfer Operations', () => {
    it('should return transfer mock', () => {
      const result = useTransfer(MOCK_DATA.userAddress, MOCK_DATA.amount)
      expect(result).toBe(mockBankWrites.transfer)
    })

    it('should return transfer token mock', () => {
      const result = useTransferToken(
        MOCK_DATA.tokenAddress,
        MOCK_DATA.userAddress,
        MOCK_DATA.amount
      )
      expect(result).toBe(mockBankWrites.transferToken)
    })

    it('should support successful transfers', async () => {
      mockBankWrites.transfer.executeWrite.mockResolvedValue(undefined)
      const result = useTransfer(MOCK_DATA.userAddress, MOCK_DATA.amount)

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle transfer errors', async () => {
      const error = new Error('Transfer failed')
      mockBankWrites.transfer.executeWrite.mockRejectedValue(error)

      const result = useTransfer(MOCK_DATA.userAddress, MOCK_DATA.amount)
      await expect(result.executeWrite()).rejects.toThrow('Transfer failed')
    })

    it('should work with different amounts', () => {
      const smallAmount = useTransfer(MOCK_DATA.userAddress, MOCK_DATA.zeroAmount)
      const largeAmount = useTransfer(MOCK_DATA.userAddress, MOCK_DATA.largeAmount)

      expect(smallAmount).toBe(mockBankWrites.transfer)
      expect(largeAmount).toBe(mockBankWrites.transfer)
    })
  })

  describe('Mock Behavior', () => {
    it('should return distinct mocks for different functions', () => {
      const pause = usePause()
      const transfer = useTransfer(MOCK_DATA.userAddress, MOCK_DATA.amount)
      const claimDividend = useClaimDividend()

      expect(pause).not.toBe(transfer)
      expect(transfer).not.toBe(claimDividend)
    })

    it('should maintain consistent interface structure', () => {
      const result = usePause()

      expect(result).toHaveProperty('executeWrite')
      expect(result).toHaveProperty('writeResult')
      expect(result).toHaveProperty('receiptResult')
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support mock reset', () => {
      mockBankWrites.pause.executeWrite.mockResolvedValue(undefined)
      resetContractMocks()

      const result = usePause()
      expect(result).toBe(mockBankWrites.pause)
    })

    it('should allow mock customization for different test scenarios', async () => {
      mockBankWrites.transfer.executeWrite.mockResolvedValueOnce('tx-hash-1')
      mockBankWrites.transfer.executeWrite.mockResolvedValueOnce('tx-hash-2')

      const result1 = useTransfer(MOCK_DATA.userAddress, MOCK_DATA.amount)
      const result2 = useTransfer(MOCK_DATA.userAddress, MOCK_DATA.amount)

      const tx1 = await result1.executeWrite()
      const tx2 = await result2.executeWrite()

      expect(tx1).toBe('tx-hash-1')
      expect(tx2).toBe('tx-hash-2')
    })
  })
})

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
  useSetInvestorAddress
} from '../writes'
import { mockBankWrites, resetContractMocks } from '@/tests/mocks'

describe('Bank Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  describe('Token Operations', () => {
    it('should return deposit token mock', () => {
      const result = useDepositToken()
      expect(result).toBe(mockBankWrites.deposit)
      expect(result.mutateAsync).toBeInstanceOf(Function)
    })

    it('should return add token support mock', () => {
      const result = useAddTokenSupport()
      expect(result).toBe(mockBankWrites.addTokenSupport)
    })

    it('should return remove token support mock', () => {
      const result = useRemoveTokenSupport()
      expect(result).toBe(mockBankWrites.removeTokenSupport)
    })

    it('should support successful token operations', async () => {
      mockBankWrites.deposit.mutateAsync.mockResolvedValue(undefined)
      const result = useDepositToken()

      await result.mutateAsync({ args: ['0xtoken', 100n] })
      expect(result.mutateAsync).toHaveBeenCalled()
    })
  })

  describe('Dividend Operations', () => {
    it('should return claim dividend mock', () => {
      const result = useClaimDividend()
      expect(result).toBe(mockBankWrites.claimDividend)
    })

    it('should return claim token dividend mock', () => {
      const result = useClaimTokenDividend()
      expect(result).toBe(mockBankWrites.claimTokenDividend)
    })

    it('should support successful dividend claims', async () => {
      mockBankWrites.claimDividend.mutateAsync.mockResolvedValue(undefined)
      const result = useClaimDividend()

      await result.mutateAsync()
      expect(result.mutateAsync).toHaveBeenCalled()
    })

    it('should handle dividend claim errors', async () => {
      const error = new Error('Claim failed')
      mockBankWrites.claimDividend.mutateAsync.mockRejectedValue(error)

      const result = useClaimDividend()
      await expect(result.mutateAsync()).rejects.toThrow('Claim failed')
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
      const result = useTransferOwnership()
      expect(result).toBe(mockBankWrites.transferOwnership)
    })

    it('should return renounce ownership mock', () => {
      const result = useRenounceOwnership()
      expect(result).toBe(mockBankWrites.renounceOwnership)
    })

    it('should return set investor address mock', () => {
      const result = useSetInvestorAddress()
      expect(result).toBe(mockBankWrites.setInvestorAddress)
    })

    it('should handle pause/unpause operations', async () => {
      mockBankWrites.pause.mutateAsync.mockResolvedValue(undefined)
      const result = usePause()

      await result.mutateAsync()
      expect(result.mutateAsync).toHaveBeenCalled()
    })
  })

  describe('Transfer Operations', () => {
    it('should return transfer mock', () => {
      const result = useTransfer()
      expect(result).toBe(mockBankWrites.transfer)
    })

    it('should return transfer token mock', () => {
      const result = useTransferToken()
      expect(result).toBe(mockBankWrites.transferToken)
    })

    it('should support successful transfers', async () => {
      mockBankWrites.transfer.mutateAsync.mockResolvedValue(undefined)
      const result = useTransfer()

      await result.mutateAsync({ args: ['0xaddr', 100n] })
      expect(result.mutateAsync).toHaveBeenCalled()
    })

    it('should handle transfer errors', async () => {
      const error = new Error('Transfer failed')
      mockBankWrites.transfer.mutateAsync.mockRejectedValue(error)

      const result = useTransfer()
      await expect(result.mutateAsync({ args: ['0xaddr', 100n] })).rejects.toThrow(
        'Transfer failed'
      )
    })
  })

  describe('Mock Behavior', () => {
    it('should return distinct mocks for different functions', () => {
      const pause = usePause()
      const transfer = useTransfer()
      const claimDividend = useClaimDividend()

      expect(pause).not.toBe(transfer)
      expect(transfer).not.toBe(claimDividend)
    })

    it('should maintain consistent interface structure', () => {
      const result = usePause()

      expect(result).toHaveProperty('mutateAsync')
      expect(result).toHaveProperty('mutate')
      expect(result).toHaveProperty('isPending')
      expect(result).toHaveProperty('isSuccess')
      expect(result).toHaveProperty('error')
      expect(result.mutateAsync).toBeInstanceOf(Function)
    })

    it('should support mock reset', () => {
      mockBankWrites.pause.mutateAsync.mockResolvedValue(undefined)
      resetContractMocks()

      const result = usePause()
      expect(result).toBe(mockBankWrites.pause)
    })

    it('should allow mock customization for different test scenarios', async () => {
      mockBankWrites.transfer.mutateAsync.mockResolvedValueOnce('tx-hash-1')
      mockBankWrites.transfer.mutateAsync.mockResolvedValueOnce('tx-hash-2')

      const result1 = useTransfer()
      const result2 = useTransfer()

      const tx1 = await result1.mutateAsync({ args: ['0xaddr', 100n] })
      const tx2 = await result2.mutateAsync({ args: ['0xaddr', 200n] })

      expect(tx1).toBe('tx-hash-1')
      expect(tx2).toBe('tx-hash-2')
    })
  })
})

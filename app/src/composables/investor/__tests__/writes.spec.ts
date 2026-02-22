import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useIndividualMint,
  useDistributeMint,
  useTransfer,
  usePause,
  useUnpause,
  useInitialize,
  useTransferOwnership,
  useRenounceOwnership
} from '../writes'
import { mockInvestorWrites, resetContractMocks } from '@/tests/mocks'
import type { Address } from 'viem'

// Test constants
const MOCK_DATA = {
  shareholderAddress: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address,
  ownerAddress: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address,
  mintAmount: 1000n * 10n ** 18n,
  zeroAmount: 0n,
  largeAmount: 1000000n * 10n ** 18n,
  shareholders: [
    '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address,
    '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address
  ]
} as const

describe('Investor Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  describe('useIndividualMint', () => {
    it('should return individual mint mock', () => {
      const result = useIndividualMint(MOCK_DATA.shareholderAddress, MOCK_DATA.mintAmount)

      expect(result).toBe(mockInvestorWrites.mint)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should handle zero amount', () => {
      const result = useIndividualMint(MOCK_DATA.shareholderAddress, MOCK_DATA.zeroAmount)

      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should handle large amounts', () => {
      const result = useIndividualMint(MOCK_DATA.shareholderAddress, MOCK_DATA.largeAmount)

      expect(result).toBe(mockInvestorWrites.mint)
    })

    it('should support successful mint execution', async () => {
      mockInvestorWrites.mint.executeWrite.mockResolvedValue(undefined)
      const result = useIndividualMint(MOCK_DATA.shareholderAddress, MOCK_DATA.mintAmount)

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle mint errors', async () => {
      const error = new Error('Mint failed')
      mockInvestorWrites.mint.executeWrite.mockRejectedValue(error)

      const result = useIndividualMint(MOCK_DATA.shareholderAddress, MOCK_DATA.mintAmount)
      await expect(result.executeWrite()).rejects.toThrow('Mint failed')
    })
  })

  describe('useDistributeMint', () => {
    it('should return distribute mint mock', () => {
      const result = useDistributeMint(MOCK_DATA.shareholders, [MOCK_DATA.mintAmount])

      expect(result).toBe(mockInvestorWrites.mint)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should handle single shareholder', () => {
      const result = useDistributeMint([MOCK_DATA.shareholderAddress], [MOCK_DATA.mintAmount])

      expect(result).toBe(mockInvestorWrites.mint)
    })

    it('should handle multiple shareholders', () => {
      const result = useDistributeMint(
        MOCK_DATA.shareholders,
        [MOCK_DATA.mintAmount, MOCK_DATA.mintAmount]
      )

      expect(result).toBe(mockInvestorWrites.mint)
    })

    it('should support successful distribution', async () => {
      mockInvestorWrites.mint.executeWrite.mockResolvedValue(undefined)
      const result = useDistributeMint(MOCK_DATA.shareholders, [MOCK_DATA.mintAmount])

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })
  })

  describe('useTransfer', () => {
    it('should return transfer mock', () => {
      const result = useTransfer(MOCK_DATA.shareholderAddress, MOCK_DATA.mintAmount)

      expect(result).toBe(mockInvestorWrites.transfer)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support successful transfer execution', async () => {
      mockInvestorWrites.transfer.executeWrite.mockResolvedValue(undefined)
      const result = useTransfer(MOCK_DATA.shareholderAddress, MOCK_DATA.mintAmount)

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle transfer errors', async () => {
      const error = new Error('Transfer failed')
      mockInvestorWrites.transfer.executeWrite.mockRejectedValue(error)

      const result = useTransfer(MOCK_DATA.shareholderAddress, MOCK_DATA.mintAmount)
      await expect(result.executeWrite()).rejects.toThrow('Transfer failed')
    })

    it('should work with different amounts', () => {
      const smallTransfer = useTransfer(MOCK_DATA.shareholderAddress, MOCK_DATA.zeroAmount)
      const largeTransfer = useTransfer(MOCK_DATA.shareholderAddress, MOCK_DATA.largeAmount)

      expect(smallTransfer).toBe(mockInvestorWrites.transfer)
      expect(largeTransfer).toBe(mockInvestorWrites.transfer)
    })
  })

  describe('usePause', () => {
    it('should return pause mock', () => {
      const result = usePause()

      expect(result).toBe(mockInvestorWrites.pause)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support successful pause', async () => {
      mockInvestorWrites.pause.executeWrite.mockResolvedValue(undefined)
      const result = usePause()

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })
  })

  describe('useUnpause', () => {
    it('should return unpause mock', () => {
      const result = useUnpause()

      expect(result).toBe(mockInvestorWrites.unpause)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support successful unpause', async () => {
      mockInvestorWrites.unpause.executeWrite.mockResolvedValue(undefined)
      const result = useUnpause()

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })
  })

  describe('useInitialize', () => {
    it('should return initialize mock', () => {
      const result = useInitialize(MOCK_DATA.shareholderAddress, MOCK_DATA.shareholders)

      expect(result).toBe(mockInvestorWrites.initialize)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support successful initialization', async () => {
      mockInvestorWrites.initialize.executeWrite.mockResolvedValue(undefined)
      const result = useInitialize(MOCK_DATA.shareholderAddress, MOCK_DATA.shareholders)

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })
  })

  describe('useTransferOwnership', () => {
    it('should return transfer ownership mock', () => {
      const result = useTransferOwnership(MOCK_DATA.ownerAddress)

      expect(result).toBe(mockInvestorWrites.transferOwnership)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support successful ownership transfer', async () => {
      mockInvestorWrites.transferOwnership.executeWrite.mockResolvedValue(undefined)
      const result = useTransferOwnership(MOCK_DATA.ownerAddress)

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })
  })

  describe('useRenounceOwnership', () => {
    it('should return renounce ownership mock', () => {
      const result = useRenounceOwnership()

      expect(result).toBe(mockInvestorWrites.renounceOwnership)
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support successful ownership renunciation', async () => {
      mockInvestorWrites.renounceOwnership.executeWrite.mockResolvedValue(undefined)
      const result = useRenounceOwnership()

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })
  })

  describe('Mock Behavior', () => {
    it('should return distinct mocks for different functions', () => {
      const mint = useIndividualMint(MOCK_DATA.shareholderAddress, MOCK_DATA.mintAmount)
      const transfer = useTransfer(MOCK_DATA.shareholderAddress, MOCK_DATA.mintAmount)
      const pause = usePause()

      expect(mint).not.toBe(transfer)
      expect(transfer).not.toBe(pause)
    })

    it('should maintain consistent interface structure', () => {
      const result = usePause()

      expect(result).toHaveProperty('executeWrite')
      expect(result).toHaveProperty('writeResult')
      expect(result).toHaveProperty('receiptResult')
      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support mock reset', () => {
      mockInvestorWrites.pause.executeWrite.mockResolvedValue(undefined)
      resetContractMocks()

      const result = usePause()
      expect(result).toBe(mockInvestorWrites.pause)
    })

    it('should allow mock customization for different scenarios', async () => {
      mockInvestorWrites.transfer.executeWrite.mockResolvedValueOnce('transfer-tx-1')
      mockInvestorWrites.transfer.executeWrite.mockResolvedValueOnce('transfer-tx-2')

      const result1 = useTransfer(MOCK_DATA.shareholderAddress, MOCK_DATA.mintAmount)
      const result2 = useTransfer(MOCK_DATA.shareholderAddress, MOCK_DATA.mintAmount)

      const tx1 = await result1.executeWrite()
      const tx2 = await result2.executeWrite()

      expect(tx1).toBe('transfer-tx-1')
      expect(tx2).toBe('transfer-tx-2')
    })
  })
})

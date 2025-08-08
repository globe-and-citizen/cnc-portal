import { describe, it, expect, vi } from 'vitest'
import { tokenSymbol, formatEtherUtil } from '../constantUtil'
import { zeroAddress } from 'viem'

// Mock the constants
vi.mock('@/constant', () => ({
  NETWORK: {
    currencySymbol: 'ETH'
  },
  USDC_ADDRESS: '0xA0b86a33E6417c6d2c6D43b6C5F7E7a6F6eA2a2A',
  USDT_ADDRESS: '0xB1c86a33E6417c6d2c6D43b6C5F7E7a6F6eA2b2B'
}))

describe('constantUtil', () => {
  describe('tokenSymbol', () => {
    it('should return USDC for USDC address', () => {
      const usdcAddress = '0xA0b86a33E6417c6d2c6D43b6C5F7E7a6F6eA2a2A'

      expect(tokenSymbol(usdcAddress)).toBe('USDC')
    })

    it('should return USDT for USDT address', () => {
      const usdtAddress = '0xB1c86a33E6417c6d2c6D43b6C5F7E7a6F6eA2b2B'

      expect(tokenSymbol(usdtAddress)).toBe('USDT')
    })

    it('should return network currency symbol for zero address', () => {
      expect(tokenSymbol(zeroAddress)).toBe('ETH')
    })

    it('should handle case insensitive addresses', () => {
      const usdcAddressUpperCase = '0xA0B86A33E6417C6D2C6D43B6C5F7E7A6F6EA2A2A'

      expect(tokenSymbol(usdcAddressUpperCase)).toBe('USDC')
    })

    it('should return empty string for unknown addresses', () => {
      const unknownAddress = '0x1234567890123456789012345678901234567890'

      expect(tokenSymbol(unknownAddress)).toBe('')
    })

    it('should handle empty string address', () => {
      expect(tokenSymbol('')).toBe('')
    })

    it('should handle malformed addresses', () => {
      expect(tokenSymbol('not-an-address')).toBe('')
      expect(tokenSymbol('0x')).toBe('')
      expect(tokenSymbol('0x123')).toBe('')
    })
  })

  describe('formatEtherUtil', () => {
    it('should format native token (ETH) using formatEther', () => {
      const amount = BigInt('1000000000000000000') // 1 ETH in wei

      const result = formatEtherUtil(amount, zeroAddress)

      expect(result).toBe('1.0')
    })

    it('should format USDC token with 6 decimals', () => {
      const amount = BigInt('1000000') // 1 USDC (6 decimals)
      const usdcAddress = '0xA0b86a33E6417c6d2c6D43b6C5F7E7a6F6eA2a2A'

      const result = formatEtherUtil(amount, usdcAddress)

      expect(result).toBe('1')
    })

    it('should format large USDC amounts correctly', () => {
      const amount = BigInt('1500000000') // 1500 USDC
      const usdcAddress = '0xA0b86a33E6417c6d2c6D43b6C5F7E7a6F6eA2a2A'

      const result = formatEtherUtil(amount, usdcAddress)

      expect(result).toBe('1500')
    })

    it('should handle small USDC amounts', () => {
      const amount = BigInt('500000') // 0.5 USDC
      const usdcAddress = '0xA0b86a33E6417c6d2c6D43b6C5F7E7a6F6eA2a2A'

      const result = formatEtherUtil(amount, usdcAddress)

      expect(result).toBe('0.5')
    })

    it('should handle zero amounts', () => {
      const amount = BigInt('0')

      expect(formatEtherUtil(amount, zeroAddress)).toBe('0.0')
      expect(formatEtherUtil(amount, '0xUSDC')).toBe('0')
    })

    it('should format large ETH amounts correctly', () => {
      const amount = BigInt('5000000000000000000') // 5 ETH

      const result = formatEtherUtil(amount, zeroAddress)

      expect(result).toBe('5.0')
    })

    it('should format fractional ETH amounts correctly', () => {
      const amount = BigInt('500000000000000000') // 0.5 ETH

      const result = formatEtherUtil(amount, zeroAddress)

      expect(result).toBe('0.5')
    })

    it('should handle very small ETH amounts', () => {
      const amount = BigInt('1000000000000000') // 0.001 ETH

      const result = formatEtherUtil(amount, zeroAddress)

      expect(result).toBe('0.001')
    })

    it('should handle very small token amounts', () => {
      const amount = BigInt('1') // 0.000001 USDC
      const usdcAddress = '0xA0b86a33E6417c6d2c6D43b6C5F7E7a6F6eA2a2A'

      const result = formatEtherUtil(amount, usdcAddress)

      expect(result).toBe('0.000001')
    })
  })
})

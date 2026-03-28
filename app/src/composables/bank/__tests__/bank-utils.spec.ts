import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useValidation } from '../utils'
import { type Address } from 'viem'

// Hoisted mock variables - viem's isAddress not covered by global mock
const { mockIsAddress } = vi.hoisted(() => ({
  mockIsAddress: vi.fn()
}))

// Test constants
const MOCK_DATA = {
  validAddress: '0x1234567890123456789012345678901234567890' as Address,
  invalidAddress: 'invalid-address' as Address,
  validAmount: '1.5',
  invalidAmount: '0',
  emptyAmount: '',
  negativeAmount: '-1',
  addresses: [
    '0x1234567890123456789012345678901234567890',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef'
  ] as Address[]
} as const

describe('useValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAddress.mockImplementation((address: string) => /^0x[a-fA-F0-9]{40}$/.test(address))
  })

  describe('validateAmount', () => {
    it('should validate positive amounts', () => {
      const { validateAmount } = useValidation()

      const result = validateAmount(MOCK_DATA.validAmount)

      expect(result).toBe(true)
    })

    it('should reject zero amount', () => {
      const { validateAmount } = useValidation()

      const result = validateAmount(MOCK_DATA.invalidAmount)

      expect(result).toBe(false)
    })

    it('should reject empty amount', () => {
      const { validateAmount } = useValidation()

      const result = validateAmount(MOCK_DATA.emptyAmount)

      expect(result).toBe(false)
    })

    it('should reject negative amounts', () => {
      const { validateAmount } = useValidation()

      const result = validateAmount(MOCK_DATA.negativeAmount)

      expect(result).toBe(false)
    })
  })

  describe('validateAddress', () => {
    it('should validate correct addresses', () => {
      const { validateAddress } = useValidation()
      mockIsAddress.mockReturnValueOnce(true)

      const result = validateAddress(MOCK_DATA.validAddress)

      expect(result).toBe(true)
      expect(mockIsAddress).toHaveBeenCalledWith(MOCK_DATA.validAddress)
    })

    it('should reject invalid addresses', () => {
      const { validateAddress } = useValidation()
      mockIsAddress.mockReturnValueOnce(false)

      const result = validateAddress(MOCK_DATA.invalidAddress)

      expect(result).toBe(false)
      expect(mockIsAddress).toHaveBeenCalledWith(MOCK_DATA.invalidAddress)
    })

    it('should use custom label in error message', () => {
      const { validateAddress } = useValidation()
      mockIsAddress.mockReturnValueOnce(false)

      const result = validateAddress(MOCK_DATA.invalidAddress, 'token')

      expect(result).toBe(false)
    })
  })
})

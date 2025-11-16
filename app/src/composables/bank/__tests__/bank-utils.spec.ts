import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useValidation } from '../utils'
import { type Address } from 'viem'

// Hoisted mock variables
const { mockAddErrorToast, mockIsAddress } = vi.hoisted(() => ({
  mockAddErrorToast: vi.fn(),
  mockIsAddress: vi.fn()
}))

// Mock external dependencies
vi.mock('@/stores', () => ({
  useToastStore: vi.fn(() => ({
    addErrorToast: mockAddErrorToast
  }))
}))

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    isAddress: mockIsAddress
  }
})

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
      expect(mockAddErrorToast).not.toHaveBeenCalled()
    })

    it('should reject zero amount', () => {
      const { validateAmount } = useValidation()

      const result = validateAmount(MOCK_DATA.invalidAmount)

      expect(result).toBe(false)
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid amount')
    })

    it('should reject empty amount', () => {
      const { validateAmount } = useValidation()

      const result = validateAmount(MOCK_DATA.emptyAmount)

      expect(result).toBe(false)
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid amount')
    })

    it('should reject negative amounts', () => {
      const { validateAmount } = useValidation()

      const result = validateAmount(MOCK_DATA.negativeAmount)

      expect(result).toBe(false)
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid amount')
    })
  })

  describe('validateAddress', () => {
    it('should validate correct addresses', () => {
      const { validateAddress } = useValidation()
      mockIsAddress.mockReturnValueOnce(true)

      const result = validateAddress(MOCK_DATA.validAddress)

      expect(result).toBe(true)
      expect(mockIsAddress).toHaveBeenCalledWith(MOCK_DATA.validAddress)
      expect(mockAddErrorToast).not.toHaveBeenCalled()
    })

    it('should reject invalid addresses', () => {
      const { validateAddress } = useValidation()
      mockIsAddress.mockReturnValueOnce(false)

      const result = validateAddress(MOCK_DATA.invalidAddress)

      expect(result).toBe(false)
      expect(mockIsAddress).toHaveBeenCalledWith(MOCK_DATA.invalidAddress)
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid address')
    })

    it('should use custom label in error message', () => {
      const { validateAddress } = useValidation()
      mockIsAddress.mockReturnValueOnce(false)

      const result = validateAddress(MOCK_DATA.invalidAddress, 'token')

      expect(result).toBe(false)
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid token')
    })
  })
})

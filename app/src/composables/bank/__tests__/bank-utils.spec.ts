import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useValidation, amountToWei } from '../utils'
import type { Address } from 'viem'

// Hoisted mock variables
const { 
  mockAddErrorToast,
  mockIsAddress,
  mockParseEther
} = vi.hoisted(() => ({
  mockAddErrorToast: vi.fn(),
  mockIsAddress: vi.fn(),
  mockParseEther: vi.fn()
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
    isAddress: mockIsAddress,
    parseEther: mockParseEther
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

  describe('validateTipParams', () => {
    beforeEach(() => {
      mockIsAddress.mockReset()
      mockIsAddress.mockReturnValue(true)
    })

    it('should validate correct tip parameters', () => {
      const { validateTipParams } = useValidation()
      
      const result = validateTipParams(MOCK_DATA.addresses, MOCK_DATA.validAmount, MOCK_DATA.validAddress)
      
      expect(result).toBe(true)
      expect(mockAddErrorToast).not.toHaveBeenCalled()
    })

    it('should reject empty recipients array', () => {
      const { validateTipParams } = useValidation()
      
      const result = validateTipParams([], MOCK_DATA.validAmount)
      
      expect(result).toBe(false)
      expect(mockAddErrorToast).toHaveBeenCalledWith('No recipients specified')
    })

    it('should reject invalid recipient addresses', () => {
      const { validateTipParams } = useValidation()
      mockIsAddress.mockReset()
      mockIsAddress.mockReturnValueOnce(true).mockReturnValueOnce(false)
      
      const result = validateTipParams(MOCK_DATA.addresses, MOCK_DATA.validAmount)
      
      expect(result).toBe(false)
      expect(mockAddErrorToast).toHaveBeenCalledWith('One or more invalid addresses')
    })

    it('should reject invalid amounts', () => {
      const { validateTipParams } = useValidation()
      
      const result = validateTipParams(MOCK_DATA.addresses, MOCK_DATA.invalidAmount)
      
      expect(result).toBe(false)
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid amount')
    })

    it('should reject invalid token address when provided', () => {
      const { validateTipParams } = useValidation()
      mockIsAddress.mockReset()
      mockIsAddress
        .mockReturnValueOnce(true) // First recipient
        .mockReturnValueOnce(true) // Second recipient
        .mockReturnValueOnce(false) // Token address
      
      const result = validateTipParams(MOCK_DATA.addresses, MOCK_DATA.validAmount, MOCK_DATA.invalidAddress)
      
      expect(result).toBe(false)
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid token address')
    })
  })
})

describe('amountToWei', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParseEther.mockImplementation((value: string) => BigInt(parseFloat(value) * 10 ** 18))
  })

  it('should convert amount to wei', () => {
    mockParseEther.mockReturnValueOnce(BigInt('1500000000000000000'))
    
    const result = amountToWei('1.5')
    
    expect(result).toBe(BigInt('1500000000000000000'))
    expect(mockParseEther).toHaveBeenCalledWith('1.5')
  })

  it('should handle zero amount', () => {
    mockParseEther.mockReturnValueOnce(BigInt(0))
    
    const result = amountToWei('0')
    
    expect(result).toBe(BigInt(0))
    expect(mockParseEther).toHaveBeenCalledWith('0')
  })
})

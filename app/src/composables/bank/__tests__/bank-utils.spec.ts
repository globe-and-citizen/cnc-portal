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
      
      const result = validateAddress(MOCK_DATA.validAddress)
      
      expect(result).toBe(true)
      expect(mockIsAddress).toHaveBeenCalledWith(MOCK_DATA.validAddress)
      expect(mockAddErrorToast).not.toHaveBeenCalled()
    })

    it('should reject invalid addresses', () => {
      mockIsAddress.mockReturnValue(false)
      const { validateAddress } = useValidation()
      
      const result = validateAddress(MOCK_DATA.invalidAddress)
      
      expect(result).toBe(false)
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid address')
    })

    it('should use custom label for error message', () => {
      mockIsAddress.mockReturnValue(false)
      const { validateAddress } = useValidation()
      
      const result = validateAddress(MOCK_DATA.invalidAddress, 'recipient')
      
      expect(result).toBe(false)
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid recipient')
    })
  })

  describe('validateTipParams', () => {
    it('should validate correct tip parameters', () => {
      const { validateTipParams } = useValidation()
      
      const result = validateTipParams(MOCK_DATA.addresses, MOCK_DATA.validAmount)
      
      expect(result).toBe(true)
      expect(mockIsAddress).toHaveBeenCalledTimes(MOCK_DATA.addresses.length)
      expect(mockAddErrorToast).not.toHaveBeenCalled()
    })

    it('should validate tip parameters with token address', () => {
      const { validateTipParams } = useValidation()
      
      const result = validateTipParams(
        MOCK_DATA.addresses, 
        MOCK_DATA.validAmount, 
        MOCK_DATA.validAddress
      )
      
      expect(result).toBe(true)
      expect(mockIsAddress).toHaveBeenCalledTimes(MOCK_DATA.addresses.length + 1)
      expect(mockAddErrorToast).not.toHaveBeenCalled()
    })

    it('should reject empty addresses array', () => {
      const { validateTipParams } = useValidation()
      
      const result = validateTipParams([], MOCK_DATA.validAmount)
      
      expect(result).toBe(false)
      expect(mockAddErrorToast).toHaveBeenCalledWith('No recipients specified')
    })

    it('should reject invalid addresses in array', () => {
      mockIsAddress.mockImplementation((address: string) => 
        address === MOCK_DATA.addresses[0] // Only first address is valid
      )
      const { validateTipParams } = useValidation()
      
      const result = validateTipParams(MOCK_DATA.addresses, MOCK_DATA.validAmount)
      
      expect(result).toBe(false)
      expect(mockAddErrorToast).toHaveBeenCalledWith('One or more invalid addresses')
    })

    it('should reject invalid amount', () => {
      const { validateTipParams } = useValidation()
      
      const result = validateTipParams(MOCK_DATA.addresses, MOCK_DATA.invalidAmount)
      
      expect(result).toBe(false)
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid amount')
    })

    it('should reject invalid token address', () => {
      mockIsAddress.mockImplementation((address: string) => 
        MOCK_DATA.addresses.includes(address as Address) // Only recipient addresses are valid
      )
      const { validateTipParams } = useValidation()
      
      const result = validateTipParams(
        MOCK_DATA.addresses, 
        MOCK_DATA.validAmount, 
        MOCK_DATA.invalidAddress
      )
      
      expect(result).toBe(false)
      expect(mockAddErrorToast).toHaveBeenCalledWith('Invalid token address')
    })
  })

  describe('Return Interface', () => {
    it('should return all validation functions', () => {
      const validation = useValidation()

      expect(validation).toHaveProperty('validateAmount')
      expect(validation).toHaveProperty('validateAddress')
      expect(validation).toHaveProperty('validateTipParams')

      expect(typeof validation.validateAmount).toBe('function')
      expect(typeof validation.validateAddress).toBe('function')
      expect(typeof validation.validateTipParams).toBe('function')
    })
  })
})

describe('amountToWei', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParseEther.mockImplementation((value: string) => BigInt(value) * BigInt(10 ** 18))
  })

  it('should convert amount to wei', () => {
    const amount = '1.5'
    const result = amountToWei(amount)

    expect(mockParseEther).toHaveBeenCalledWith(amount)
    expect(result).toBe(BigInt('1500000000000000000'))
  })

  it('should handle zero amount', () => {
    const amount = '0'
    const result = amountToWei(amount)

    expect(mockParseEther).toHaveBeenCalledWith(amount)
    expect(result).toBe(BigInt('0'))
  })

  it('should handle large amounts', () => {
    const amount = '1000'
    mockParseEther.mockReturnValue(BigInt('1000000000000000000000'))
    
    const result = amountToWei(amount)

    expect(mockParseEther).toHaveBeenCalledWith(amount)
    expect(result).toBe(BigInt('1000000000000000000000'))
  })
})

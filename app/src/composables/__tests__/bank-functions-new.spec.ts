import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBankWritesFunctions } from '../bank/functions'
import { BANK_FUNCTION_NAMES } from '../bank/types'
import type { Address } from 'viem'

// Hoisted mock variables
const { 
  mockUseBankWrites,
  mockUseValidation,
  mockAmountToWei,
  mockAddErrorToast
} = vi.hoisted(() => ({
  mockUseBankWrites: vi.fn(),
  mockUseValidation: vi.fn(),
  mockAmountToWei: vi.fn(),
  mockAddErrorToast: vi.fn()
}))

// Mock external dependencies
vi.mock('./writes', () => ({
  useBankWrites: mockUseBankWrites
}))

vi.mock('./utils', () => ({
  useValidation: mockUseValidation,
  amountToWei: mockAmountToWei
}))

vi.mock('@/stores', () => ({
  useToastStore: vi.fn(() => ({
    addErrorToast: mockAddErrorToast
  }))
}))

// Test constants
const MOCK_DATA = {
  validAddress: '0x1234567890123456789012345678901234567890' as Address,
  invalidAddress: 'invalid-address' as Address,
  validAmount: '1.5',
  invalidAmount: '0',
  tokenSymbol: 'USDC',
  emptySymbol: '',
  addresses: [
    '0x1234567890123456789012345678901234567890',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef'
  ] as Address[],
  amountInWei: BigInt('1500000000000000000')
} as const

const mockWrites = {
  executeWrite: vi.fn()
}

const mockValidation = {
  validateAmount: vi.fn(),
  validateAddress: vi.fn(),
  validateTipParams: vi.fn()
}

describe('useBankWritesFunctions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBankWrites.mockReturnValue(mockWrites)
    mockUseValidation.mockReturnValue(mockValidation)
    mockAmountToWei.mockReturnValue(MOCK_DATA.amountInWei)
  })

  describe('Admin Functions', () => {
    describe('pauseContract', () => {
      it('should call executeWrite with PAUSE function', () => {
        const { pauseContract } = useBankWritesFunctions()
        
        pauseContract()

        expect(mockWrites.executeWrite).toHaveBeenCalledWith(BANK_FUNCTION_NAMES.PAUSE)
      })
    })

    describe('unpauseContract', () => {
      it('should call executeWrite with UNPAUSE function', () => {
        const { unpauseContract } = useBankWritesFunctions()
        
        unpauseContract()

        expect(mockWrites.executeWrite).toHaveBeenCalledWith(BANK_FUNCTION_NAMES.UNPAUSE)
      })
    })

    describe('changeTipsAddress', () => {
      it('should execute with valid address', () => {
        mockValidation.validateAddress.mockReturnValue(true)
        const { changeTipsAddress } = useBankWritesFunctions()
        
        const result = changeTipsAddress(MOCK_DATA.validAddress)

        expect(mockValidation.validateAddress).toHaveBeenCalledWith(MOCK_DATA.validAddress, 'tips address')
        expect(mockWrites.executeWrite).toHaveBeenCalledWith(
          BANK_FUNCTION_NAMES.CHANGE_TIPS_ADDRESS,
          [MOCK_DATA.validAddress]
        )
        expect(result).toBeDefined()
      })

      it('should not execute with invalid address', () => {
        mockValidation.validateAddress.mockReturnValue(false)
        const { changeTipsAddress } = useBankWritesFunctions()
        
        const result = changeTipsAddress(MOCK_DATA.invalidAddress)

        expect(mockValidation.validateAddress).toHaveBeenCalledWith(MOCK_DATA.invalidAddress, 'tips address')
        expect(mockWrites.executeWrite).not.toHaveBeenCalled()
        expect(result).toBeUndefined()
      })
    })
  })

  describe('Transfer Functions', () => {
    describe('transferEth', () => {
      it('should execute with valid parameters', () => {
        mockValidation.validateAddress.mockReturnValue(true)
        mockValidation.validateAmount.mockReturnValue(true)
        const { transferEth } = useBankWritesFunctions()
        
        const result = transferEth(MOCK_DATA.validAddress, MOCK_DATA.validAmount)

        expect(mockValidation.validateAddress).toHaveBeenCalledWith(MOCK_DATA.validAddress, 'recipient address')
        expect(mockValidation.validateAmount).toHaveBeenCalledWith(MOCK_DATA.validAmount)
        expect(mockAmountToWei).toHaveBeenCalledWith(MOCK_DATA.validAmount)
        expect(mockWrites.executeWrite).toHaveBeenCalledWith(
          BANK_FUNCTION_NAMES.TRANSFER,
          [MOCK_DATA.validAddress, MOCK_DATA.amountInWei],
          MOCK_DATA.amountInWei
        )
        expect(result).toBeDefined()
      })
    })
  })

  describe('Tipping Functions', () => {
    describe('sendEthTip', () => {
      it('should execute with valid parameters', () => {
        mockValidation.validateTipParams.mockReturnValue(true)
        const { sendEthTip } = useBankWritesFunctions()
        
        const result = sendEthTip(MOCK_DATA.addresses, MOCK_DATA.validAmount)

        expect(mockValidation.validateTipParams).toHaveBeenCalledWith(MOCK_DATA.addresses, MOCK_DATA.validAmount)
        expect(mockAmountToWei).toHaveBeenCalledWith(MOCK_DATA.validAmount)
        expect(mockWrites.executeWrite).toHaveBeenCalledWith(
          BANK_FUNCTION_NAMES.SEND_TIP,
          [MOCK_DATA.addresses, MOCK_DATA.amountInWei],
          MOCK_DATA.amountInWei
        )
        expect(result).toBeDefined()
      })
    })
  })

  describe('Return Interface', () => {
    it('should return all admin functions', () => {
      const bankFunctions = useBankWritesFunctions()

      expect(bankFunctions).toHaveProperty('pauseContract')
      expect(bankFunctions).toHaveProperty('unpauseContract')
      expect(bankFunctions).toHaveProperty('changeTipsAddress')

      expect(typeof bankFunctions.pauseContract).toBe('function')
      expect(typeof bankFunctions.unpauseContract).toBe('function')
      expect(typeof bankFunctions.changeTipsAddress).toBe('function')
    })
  })
})

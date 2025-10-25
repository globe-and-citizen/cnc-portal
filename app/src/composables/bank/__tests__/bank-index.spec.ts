import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBankContract } from '../index'

// Hoisted mock variables
const { mockUseBankReads, mockUseBankWritesFunctions } = vi.hoisted(() => ({
  mockUseBankReads: vi.fn(),
  mockUseBankWritesFunctions: vi.fn()
}))

// Mock external dependencies
vi.mock('../reads', () => ({
  useBankReads: mockUseBankReads
}))

vi.mock('../functions', () => ({
  useBankWritesFunctions: mockUseBankWritesFunctions
}))

// Test constants
const mockReads = {
  bankAddress: '0x1234567890123456789012345678901234567890',
  isBankAddressValid: true,
  useBankPaused: vi.fn(),
  useBankOwner: vi.fn(),
  useBankSupportedTokens: vi.fn()
}

const mockWriteFunctions = {
  executeWrite: vi.fn(),
  estimateGas: vi.fn(),
  canExecuteTransaction: vi.fn(),
  pauseContract: vi.fn(),
  unpauseContract: vi.fn(),
  changeTokenAddress: vi.fn(),
  transferOwnership: vi.fn(),
  renounceOwnership: vi.fn(),
  depositToken: vi.fn(),
  transferEth: vi.fn(),
  transferToken: vi.fn()
}

describe('useBankContract (Main Composable)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBankReads.mockReturnValue(mockReads)
    mockUseBankWritesFunctions.mockReturnValue(mockWriteFunctions)
  })

  describe('Initialization', () => {
    it('should initialize reads and write functions', () => {
      useBankContract()

      expect(mockUseBankReads).toHaveBeenCalled()
      expect(mockUseBankWritesFunctions).toHaveBeenCalled()
    })
  })

  describe('Combined Interface', () => {
    it('should combine reads and write functions', () => {
      const bankContract = useBankContract()

      // Should have all read properties
      expect(bankContract.bankAddress).toBe(mockReads.bankAddress)
      expect(bankContract.isBankAddressValid).toBe(mockReads.isBankAddressValid)
      expect(bankContract.useBankPaused).toBe(mockReads.useBankPaused)
      expect(bankContract.useBankOwner).toBe(mockReads.useBankOwner)
      expect(bankContract.useBankSupportedTokens).toBe(mockReads.useBankSupportedTokens)

      // Should have all write function properties
      expect(bankContract.executeWrite).toBe(mockWriteFunctions.executeWrite)
      expect(bankContract.estimateGas).toBe(mockWriteFunctions.estimateGas)
      expect(bankContract.canExecuteTransaction).toBe(mockWriteFunctions.canExecuteTransaction)

      // Admin functions
      expect(bankContract.pauseContract).toBe(mockWriteFunctions.pauseContract)
      expect(bankContract.unpauseContract).toBe(mockWriteFunctions.unpauseContract)
      expect(bankContract.transferOwnership).toBe(mockWriteFunctions.transferOwnership)
      expect(bankContract.renounceOwnership).toBe(mockWriteFunctions.renounceOwnership)

      // Transfer functions
      expect(bankContract.depositToken).toBe(mockWriteFunctions.depositToken)
      expect(bankContract.transferEth).toBe(mockWriteFunctions.transferEth)
      expect(bankContract.transferToken).toBe(mockWriteFunctions.transferToken)
    })
  })

  describe('Spread Operator Functionality', () => {
    it('should properly spread all properties from both composables', () => {
      const bankContract = useBankContract()

      // Count properties to ensure all are included
      const readKeys = Object.keys(mockReads)
      const writeFunctionKeys = Object.keys(mockWriteFunctions)
      const totalExpectedKeys = readKeys.length + writeFunctionKeys.length

      const bankContractKeys = Object.keys(bankContract)

      // Should have at least all the keys from both composables
      expect(bankContractKeys.length).toBeGreaterThanOrEqual(totalExpectedKeys)

      // Check that all read keys are present
      readKeys.forEach((key) => {
        expect(bankContract).toHaveProperty(key)
      })

      // Check that all write function keys are present
      writeFunctionKeys.forEach((key) => {
        expect(bankContract).toHaveProperty(key)
      })
    })
  })

  describe('Function Types', () => {
    it('should maintain correct function types', () => {
      const bankContract = useBankContract()

      // Read functions should be functions
      expect(typeof bankContract.useBankPaused).toBe('function')
      expect(typeof bankContract.useBankOwner).toBe('function')
      expect(typeof bankContract.useBankSupportedTokens).toBe('function')

      // Write functions should be functions
      expect(typeof bankContract.executeWrite).toBe('function')
      expect(typeof bankContract.estimateGas).toBe('function')
      expect(typeof bankContract.canExecuteTransaction).toBe('function')

      // Admin functions should be functions
      expect(typeof bankContract.pauseContract).toBe('function')
      expect(typeof bankContract.unpauseContract).toBe('function')
      expect(typeof bankContract.transferOwnership).toBe('function')
      expect(typeof bankContract.renounceOwnership).toBe('function')

      // Transfer functions should be functions
      expect(typeof bankContract.depositToken).toBe('function')
      expect(typeof bankContract.transferEth).toBe('function')
      expect(typeof bankContract.transferToken).toBe('function')
    })
  })

  describe('Property Override Behavior', () => {
    it('should handle property conflicts correctly', () => {
      // Create a scenario where both composables have the same property
      const conflictingMockReads = {
        ...mockReads,
        executeWrite: 'from-reads'
      }

      const conflictingMockWriteFunctions = {
        ...mockWriteFunctions,
        executeWrite: 'from-write-functions'
      }

      mockUseBankReads.mockReturnValue(conflictingMockReads)
      mockUseBankWritesFunctions.mockReturnValue(conflictingMockWriteFunctions)

      const bankContract = useBankContract()

      // Write functions should override reads (because of spread order)
      expect(bankContract.executeWrite).toBe('from-write-functions')
    })
  })

  describe('Real-world Usage Patterns', () => {
    it('should support destructuring common patterns', () => {
      const { bankAddress, isBankAddressValid, useBankPaused, pauseContract, transferEth } =
        useBankContract()

      expect(bankAddress).toBeDefined()
      expect(isBankAddressValid).toBeDefined()
      expect(useBankPaused).toBeDefined()
      expect(pauseContract).toBeDefined()
      expect(transferEth).toBeDefined()
    })

    it('should support selective destructuring of admin functions', () => {
      const { pauseContract, unpauseContract, transferOwnership } = useBankContract()

      expect(pauseContract).toBe(mockWriteFunctions.pauseContract)
      expect(unpauseContract).toBe(mockWriteFunctions.unpauseContract)
      expect(transferOwnership).toBe(mockWriteFunctions.transferOwnership)
    })

    it('should support selective destructuring of transfer functions', () => {
      const { transferEth, transferToken, depositToken } = useBankContract()

      expect(transferEth).toBe(mockWriteFunctions.transferEth)
      expect(transferToken).toBe(mockWriteFunctions.transferToken)
      expect(depositToken).toBe(mockWriteFunctions.depositToken)
    })
  })

  describe('Composable Isolation', () => {
    it('should not affect the original composables', () => {
      const bankContract1 = useBankContract()
      const bankContract2 = useBankContract()

      expect(bankContract1).not.toBe(bankContract2)
      expect(mockUseBankReads).toHaveBeenCalledTimes(2)
      expect(mockUseBankWritesFunctions).toHaveBeenCalledTimes(2)
    })
  })
})

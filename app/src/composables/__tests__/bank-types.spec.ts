import { describe, it, expect } from 'vitest'
import { BANK_FUNCTION_NAMES, isValidBankFunction, type BankFunctionName } from '../bank/types'

describe('BANK_FUNCTION_NAMES', () => {
  it('should contain all expected read function names', () => {
    expect(BANK_FUNCTION_NAMES.PAUSED).toBe('paused')
    expect(BANK_FUNCTION_NAMES.OWNER).toBe('owner')
    expect(BANK_FUNCTION_NAMES.TIPS_ADDRESS).toBe('tipsAddress')
    expect(BANK_FUNCTION_NAMES.IS_TOKEN_SUPPORTED).toBe('isTokenSupported')
    expect(BANK_FUNCTION_NAMES.SUPPORTED_TOKENS).toBe('supportedTokens')
  })

  it('should contain all expected write function names', () => {
    expect(BANK_FUNCTION_NAMES.PAUSE).toBe('pause')
    expect(BANK_FUNCTION_NAMES.UNPAUSE).toBe('unpause')
    expect(BANK_FUNCTION_NAMES.CHANGE_TIPS_ADDRESS).toBe('changeTipsAddress')
    expect(BANK_FUNCTION_NAMES.CHANGE_TOKEN_ADDRESS).toBe('changeTokenAddress')
    expect(BANK_FUNCTION_NAMES.TRANSFER_OWNERSHIP).toBe('transferOwnership')
    expect(BANK_FUNCTION_NAMES.RENOUNCE_OWNERSHIP).toBe('renounceOwnership')
    expect(BANK_FUNCTION_NAMES.DEPOSIT_TOKEN).toBe('depositToken')
    expect(BANK_FUNCTION_NAMES.TRANSFER).toBe('transfer')
    expect(BANK_FUNCTION_NAMES.TRANSFER_TOKEN).toBe('transferToken')
    expect(BANK_FUNCTION_NAMES.SEND_TIP).toBe('sendTip')
    expect(BANK_FUNCTION_NAMES.SEND_TOKEN_TIP).toBe('sendTokenTip')
    expect(BANK_FUNCTION_NAMES.PUSH_TIP).toBe('pushTip')
    expect(BANK_FUNCTION_NAMES.PUSH_TOKEN_TIP).toBe('pushTokenTip')
    expect(BANK_FUNCTION_NAMES.INITIALIZE).toBe('initialize')
  })

  it('should be immutable (as const)', () => {
    // Test that the object is read-only
    expect(() => {
      // @ts-expect-error - Testing runtime immutability
      BANK_FUNCTION_NAMES.PAUSED = 'modified'
    }).toThrow()
  })
})

describe('isValidBankFunction', () => {
  describe('Valid Function Names', () => {
    const validFunctions: BankFunctionName[] = [
      // Read functions
      'paused',
      'owner', 
      'tipsAddress',
      'isTokenSupported',
      'supportedTokens',
      // Write functions
      'pause',
      'unpause',
      'changeTipsAddress',
      'changeTokenAddress',
      'transferOwnership',
      'renounceOwnership',
      'depositToken',
      'transfer',
      'transferToken',
      'sendTip',
      'sendTokenTip',
      'pushTip',
      'pushTokenTip',
      'initialize'
    ]

    it.each(validFunctions)('should validate "%s" as a valid bank function', (functionName) => {
      expect(isValidBankFunction(functionName)).toBe(true)
    })
  })

  describe('Invalid Function Names', () => {
    const invalidFunctions = [
      '',
      'invalidFunction',
      'notABankFunction',
      'randomString',
      'pause_contract', // Wrong format
      'transferowner', // Wrong case
      'PAUSE', // Wrong case
      'send_tip', // Wrong format
      'pushTokenTips', // Wrong plural
      'supportedToken', // Wrong singular
      undefined,
      null,
      123,
      {},
      []
    ]

    it.each(invalidFunctions)('should invalidate "%s" as a bank function', (functionName) => {
      expect(isValidBankFunction(functionName as string)).toBe(false)
    })
  })

  describe('Type Safety', () => {
    it('should provide proper type narrowing for valid functions', () => {
      const testFunction = (fn: string): fn is BankFunctionName => {
        return isValidBankFunction(fn)
      }

      const validFunction = 'pause'
      const invalidFunction = 'invalidFunction'

      expect(testFunction(validFunction)).toBe(true)
      expect(testFunction(invalidFunction)).toBe(false)
    })

    it('should work with all constants from BANK_FUNCTION_NAMES', () => {
      Object.values(BANK_FUNCTION_NAMES).forEach(functionName => {
        expect(isValidBankFunction(functionName)).toBe(true)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(isValidBankFunction('')).toBe(false)
    })

    it('should handle strings with extra whitespace', () => {
      expect(isValidBankFunction(' pause ')).toBe(false)
      expect(isValidBankFunction('pause ')).toBe(false)
      expect(isValidBankFunction(' pause')).toBe(false)
    })

    it('should be case sensitive', () => {
      expect(isValidBankFunction('PAUSE')).toBe(false)
      expect(isValidBankFunction('Pause')).toBe(false)
      expect(isValidBankFunction('pAuSe')).toBe(false)
    })

    it('should handle special characters', () => {
      expect(isValidBankFunction('pause!')).toBe(false)
      expect(isValidBankFunction('pause-')).toBe(false)
      expect(isValidBankFunction('pause_')).toBe(false)
    })
  })
})

describe('BankFunctionName Type', () => {
  it('should only accept valid function names', () => {
    // TypeScript compile-time test
    const validFunction: BankFunctionName = 'pause'
    expect(validFunction).toBe('pause')

    // This would cause a TypeScript error if uncommented:
    // const invalidFunction: BankFunctionName = 'invalidFunction'
  })

  it('should work with all BANK_FUNCTION_NAMES values', () => {
    // Each value from BANK_FUNCTION_NAMES should be assignable to BankFunctionName
    const pauseFunction: BankFunctionName = BANK_FUNCTION_NAMES.PAUSE
    const ownerFunction: BankFunctionName = BANK_FUNCTION_NAMES.OWNER
    const transferFunction: BankFunctionName = BANK_FUNCTION_NAMES.TRANSFER

    expect(pauseFunction).toBe('pause')
    expect(ownerFunction).toBe('owner')
    expect(transferFunction).toBe('transfer')
  })
})

describe('Constants Integrity', () => {
  it('should have consistent function names across read operations', () => {
    const readFunctions = [
      BANK_FUNCTION_NAMES.PAUSED,
      BANK_FUNCTION_NAMES.OWNER,
      BANK_FUNCTION_NAMES.TIPS_ADDRESS,
      BANK_FUNCTION_NAMES.IS_TOKEN_SUPPORTED,
      BANK_FUNCTION_NAMES.SUPPORTED_TOKENS
    ]

    readFunctions.forEach(func => {
      expect(typeof func).toBe('string')
      expect(func.length).toBeGreaterThan(0)
      expect(isValidBankFunction(func)).toBe(true)
    })
  })

  it('should have consistent function names across write operations', () => {
    const writeFunctions = [
      BANK_FUNCTION_NAMES.PAUSE,
      BANK_FUNCTION_NAMES.UNPAUSE,
      BANK_FUNCTION_NAMES.CHANGE_TIPS_ADDRESS,
      BANK_FUNCTION_NAMES.CHANGE_TOKEN_ADDRESS,
      BANK_FUNCTION_NAMES.TRANSFER_OWNERSHIP,
      BANK_FUNCTION_NAMES.RENOUNCE_OWNERSHIP,
      BANK_FUNCTION_NAMES.DEPOSIT_TOKEN,
      BANK_FUNCTION_NAMES.TRANSFER,
      BANK_FUNCTION_NAMES.TRANSFER_TOKEN,
      BANK_FUNCTION_NAMES.SEND_TIP,
      BANK_FUNCTION_NAMES.SEND_TOKEN_TIP,
      BANK_FUNCTION_NAMES.PUSH_TIP,
      BANK_FUNCTION_NAMES.PUSH_TOKEN_TIP,
      BANK_FUNCTION_NAMES.INITIALIZE
    ]

    writeFunctions.forEach(func => {
      expect(typeof func).toBe('string')
      expect(func.length).toBeGreaterThan(0)
      expect(isValidBankFunction(func)).toBe(true)
    })
  })

  it('should have no duplicate function names', () => {
    const allFunctions = Object.values(BANK_FUNCTION_NAMES)
    const uniqueFunctions = [...new Set(allFunctions)]
    
    expect(allFunctions.length).toBe(uniqueFunctions.length)
  })

  it('should have meaningful function names', () => {
    Object.entries(BANK_FUNCTION_NAMES).forEach(([key, value]) => {
      // Function names should not be empty
      expect(value.length).toBeGreaterThan(0)
      
      // Function names should not contain spaces
      expect(value).not.toMatch(/\s/)
      
      // Function names should be camelCase (start with lowercase)
      expect(value[0]).toBe(value[0].toLowerCase())
      
      // Constant keys should be SCREAMING_SNAKE_CASE
      expect(key).toBe(key.toUpperCase())
      expect(key).toMatch(/^[A-Z][A-Z_]*[A-Z]$|^[A-Z]$/)
    })
  })
})

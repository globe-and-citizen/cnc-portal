import { describe, it, expect } from 'vitest'
import { validateSafeTransfer } from '@/utils/safe'

describe('validateSafeTransfer', () => {
  const validRecipient = '0x2222222222222222222222222222222222222222'
  const validOptions = {
    to: validRecipient,
    amount: '100',
    tokenAddress: '0x3333333333333333333333333333333333333333'
  }

  describe('valid inputs', () => {
    it('should return valid for correct safe transfer', () => {
      const result = validateSafeTransfer(validOptions)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('invalid recipient address', () => {
    it('should reject invalid recipient address', () => {
      const result = validateSafeTransfer({
        ...validOptions,
        to: 'invalid-recipient'
      })
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid recipient address')
    })

    it('should reject empty recipient address', () => {
      const result = validateSafeTransfer({
        ...validOptions,
        to: ''
      })
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid recipient address')
    })
  })

  describe('invalid amount', () => {
    it('should reject zero amount', () => {
      const result = validateSafeTransfer({
        ...validOptions,
        amount: '0'
      })
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid transfer amount')
    })

    it('should reject negative amount', () => {
      const result = validateSafeTransfer({
        ...validOptions,
        amount: '-10'
      })
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid transfer amount')
    })

    it('should reject empty amount', () => {
      const result = validateSafeTransfer({
        ...validOptions,
        amount: ''
      })
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid transfer amount')
    })

    it('should reject undefined amount', () => {
      const result = validateSafeTransfer({
        ...validOptions,
        amount: undefined as unknown as string
      })
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid transfer amount')
    })
  })
})

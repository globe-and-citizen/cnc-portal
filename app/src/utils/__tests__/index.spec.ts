import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { waitForCondition, formatDataForDisplay } from '../index'

describe('Utils Index Functions', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('waitForCondition', () => {
    it('should resolve immediately when condition is already true', async () => {
      const condition = vi.fn(() => true)
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const promise = waitForCondition(condition)
      
      // Fast-forward time to trigger the first check
      vi.advanceTimersByTime(1000)
      
      const result = await promise
      
      expect(result).toBe(true)
      expect(condition).toHaveBeenCalledTimes(1)
      expect(consoleLogSpy).toHaveBeenCalledWith('Checking condition...')
      
      consoleLogSpy.mockRestore()
    })

    it('should resolve when condition becomes true after multiple checks', async () => {
      let callCount = 0
      const condition = vi.fn(() => {
        callCount++
        return callCount >= 3
      })
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const promise = waitForCondition(condition)
      
      // Advance timers to simulate multiple interval checks
      vi.advanceTimersByTime(1000) // First check - false
      vi.advanceTimersByTime(1000) // Second check - false
      vi.advanceTimersByTime(1000) // Third check - true
      
      const result = await promise
      
      expect(result).toBe(true)
      expect(condition).toHaveBeenCalledTimes(3)
      expect(consoleLogSpy).toHaveBeenCalledTimes(3)
      
      consoleLogSpy.mockRestore()
    })

    it('should reject when timeout is reached with default timeout (5000ms)', async () => {
      const condition = vi.fn(() => false)
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const promise = waitForCondition(condition)
      
      // Advance past the default timeout (5000ms)
      vi.advanceTimersByTime(6000)
      
      await expect(promise).rejects.toThrow('Condition not met within timeout')
      // Verify condition was called multiple times (at least 5)
      expect(condition.mock.calls.length).toBeGreaterThanOrEqual(5)
      
      consoleLogSpy.mockRestore()
    })

    it('should reject when timeout is reached with custom timeout', async () => {
      const condition = vi.fn(() => false)
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const customTimeout = 3000

      const promise = waitForCondition(condition, customTimeout)
      
      // Advance past the custom timeout
      vi.advanceTimersByTime(4000)
      
      await expect(promise).rejects.toThrow('Condition not met within timeout')
      // Allow for 3 or 4 calls due to timing variations in fake timers
      expect(condition.mock.calls.length).toBeGreaterThanOrEqual(3)
      
      consoleLogSpy.mockRestore()
    })

    it('should use default timeout of 5000ms when no timeout specified', async () => {
      const condition = vi.fn(() => false)
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const promise = waitForCondition(condition) // No timeout specified, should use default 5000ms
      
      // Advance past the default timeout (5000ms)
      vi.advanceTimersByTime(6000)
      
      await expect(promise).rejects.toThrow('Condition not met within timeout')
      expect(condition.mock.calls.length).toBeGreaterThanOrEqual(5)
      
      consoleLogSpy.mockRestore()
    })

    it('should check condition at regular 1000ms intervals', async () => {
      let callCount = 0
      const condition = vi.fn(() => {
        callCount++
        return callCount >= 4
      })
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const promise = waitForCondition(condition)
      
      // Check that condition is called at specific intervals
      expect(condition).toHaveBeenCalledTimes(0)
      
      vi.advanceTimersByTime(1000)
      expect(condition).toHaveBeenCalledTimes(1)
      
      vi.advanceTimersByTime(1000)
      expect(condition).toHaveBeenCalledTimes(2)
      
      vi.advanceTimersByTime(1000)
      expect(condition).toHaveBeenCalledTimes(3)
      
      vi.advanceTimersByTime(1000)
      expect(condition).toHaveBeenCalledTimes(4)
      
      const result = await promise
      expect(result).toBe(true)
      
      consoleLogSpy.mockRestore()
    })

    it('should stop checking after condition becomes true', async () => {
      let callCount = 0
      const condition = vi.fn(() => {
        callCount++
        return callCount >= 2
      })
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const promise = waitForCondition(condition)
      
      vi.advanceTimersByTime(1000) // First check - false
      vi.advanceTimersByTime(1000) // Second check - true (should resolve)
      
      await promise
      
      // Advance more time to ensure no more calls happen
      vi.advanceTimersByTime(3000)
      
      expect(condition).toHaveBeenCalledTimes(2) // Should stop after condition is true
      
      consoleLogSpy.mockRestore()
    })
  })

  describe('formatDataForDisplay', () => {
    it('should return "null" for null input', () => {
      expect(formatDataForDisplay(null)).toBe('null')
    })

    it('should return "null" for undefined input', () => {
      expect(formatDataForDisplay(undefined)).toBe('null')
    })

    it('should handle primitive values', () => {
      expect(formatDataForDisplay('hello')).toBe('hello')
      expect(formatDataForDisplay(123)).toBe(123)
      expect(formatDataForDisplay(true)).toBe(true)
      expect(formatDataForDisplay(false)).toBe(false)
    })

    it('should handle simple objects', () => {
      const simpleObject = { name: 'John', age: 30 }
      const result = formatDataForDisplay(simpleObject) as unknown as { name: string; age: number }
      
      expect(result).toEqual({ name: 'John', age: 30 })
      expect(result.name).toBe('John')
      expect(result.age).toBe(30)
    })

    it('should convert BigInt values to strings', () => {
      const dataWithBigInt = {
        amount: BigInt('9007199254740991'),
        balance: BigInt(123456789)
      }
      
      const result = formatDataForDisplay(dataWithBigInt) as unknown as {
        amount: string
        balance: string
      }
      
      expect(result.amount).toBe('9007199254740991')
      expect(result.balance).toBe('123456789')
    })

    it('should handle arrays containing BigInt values', () => {
      const arrayWithBigInt = [BigInt(123), 'normal string']
      
      const result = formatDataForDisplay(arrayWithBigInt) as unknown as [string, string]
      
      expect(result[0]).toBe('123')
      expect(result[1]).toBe('normal string')
    })

    it('should handle empty objects and arrays', () => {
      expect(formatDataForDisplay({})).toEqual({})
      expect(formatDataForDisplay([])).toEqual([])
    })

    it('should handle circular references gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const circularObject: Record<string, unknown> = { name: 'test' }
      circularObject.self = circularObject
      
      const result = formatDataForDisplay(circularObject)
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error formatting data for display:',
        expect.any(Error)
      )
      expect(result).toBe('[object Object]')
      
      consoleWarnSpy.mockRestore()
    })

    it('should handle non-serializable objects gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const problematicObject = {
        get badProperty() {
          throw new Error('Cannot serialize this property')
        }
      }
      
      const result = formatDataForDisplay(problematicObject)
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error formatting data for display:',
        expect.any(Error)
      )
      expect(result).toBe('[object Object]')
      
      consoleWarnSpy.mockRestore()
    })

    it('should handle very large BigInt values correctly', () => {
      const largeNumbers = {
        veryLarge: BigInt('123456789012345678901234567890'),
        maxSafeInteger: BigInt(Number.MAX_SAFE_INTEGER)
      }
      
      const result = formatDataForDisplay(largeNumbers) as unknown as {
        veryLarge: string
        maxSafeInteger: string
      }
      
      expect(result.veryLarge).toBe('123456789012345678901234567890')
      expect(result.maxSafeInteger).toBe('9007199254740991')
    })
  })
})
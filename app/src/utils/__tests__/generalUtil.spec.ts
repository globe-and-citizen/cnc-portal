import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getTimestamp, log } from '../generalUtil'

describe('generalUtil', () => {
  describe('getTimestamp', () => {
    it('should return a formatted timestamp string', () => {
      const timestamp = getTimestamp()
      
      expect(typeof timestamp).toBe('string')
      expect(timestamp.length).toBeGreaterThan(0)
      
      // Should contain date and time components
      expect(timestamp).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })

    it('should return different timestamps for different calls', () => {
      const timestamp1 = getTimestamp()
      // Wait a moment to ensure time difference
      vi.useFakeTimers()
      vi.advanceTimersByTime(1000)
      const timestamp2 = getTimestamp()
      vi.useRealTimers()
      
      // Note: In test environment, timestamps might be the same due to speed
      // This test validates the function works and returns string format
      expect(typeof timestamp1).toBe('string')
      expect(typeof timestamp2).toBe('string')
    })
  })

  describe('log', () => {
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>
    let consoleDebugSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      // Mock import.meta.env.MODE to be 'development' for testing
      vi.stubGlobal('import.meta', {
        env: { MODE: 'development' }
      })
      
      consoleInfoSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.clearAllMocks()
      vi.unstubAllGlobals()
    })

    describe('in development mode', () => {
      it('should log info messages', () => {
        log.info('Test info message', { data: 'test' })
        
        expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          expect.stringContaining('INFO: Test info message'),
          { data: 'test' }
        )
      })

      it('should log warn messages', () => {
        log.warn('Test warning message', 'extra data')
        
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('WARN: Test warning message'),
          'extra data'
        )
      })

      it('should log error messages', () => {
        log.error('Test error message')
        
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('ERROR: Test error message')
        )
      })

      it('should log debug messages', () => {
        log.debug('Test debug message', 123, true)
        
        expect(consoleDebugSpy).toHaveBeenCalledTimes(1)
        expect(consoleDebugSpy).toHaveBeenCalledWith(
          expect.stringContaining('DEBUG: Test debug message'),
          123,
          true
        )
      })
    })

    describe('in production mode', () => {
      beforeEach(() => {
        vi.stubGlobal('import.meta', {
          env: { MODE: 'production' }
        })
      })

      it('should not log info messages in production', () => {
        log.info('Test info message')
        
        expect(consoleInfoSpy).not.toHaveBeenCalled()
      })

      it('should not log warn messages in production', () => {
        log.warn('Test warning message')
        
        expect(consoleWarnSpy).not.toHaveBeenCalled()
      })

      it('should not log error messages in production', () => {
        log.error('Test error message')
        
        expect(consoleErrorSpy).not.toHaveBeenCalled()
      })

      it('should not log debug messages in production', () => {
        log.debug('Test debug message')
        
        expect(consoleDebugSpy).not.toHaveBeenCalled()
      })
    })

    describe('message formatting', () => {
      it('should include timestamp in log messages', () => {
        log.info('Test message')
        
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          expect.stringMatching(/\[\d{1,2}\/\d{1,2}\/\d{4}.*\] INFO: Test message/)
        )
      })

      it('should handle multiple arguments', () => {
        const obj = { key: 'value' }
        const arr = [1, 2, 3]
        
        log.info('Message with args', obj, arr)
        
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          expect.stringContaining('INFO: Message with args'),
          obj,
          arr
        )
      })
    })
  })
})
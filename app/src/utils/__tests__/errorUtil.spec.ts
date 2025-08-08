import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseError } from '../errorUtil'
import type { Abi } from 'viem'

// Mock the generalUtil log functions
vi.mock('../generalUtil', () => ({
  log: {
    error: vi.fn()
  }
}))

describe('errorUtil', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseError', () => {
    it('should handle Error instances with message', () => {
      const error = new Error('Test error message')
      const result = parseError(error)

      expect(result).toBe('Test error message')
    })

    it('should handle MetaMask error with info property', () => {
      const metaMaskError = new Error('MetaMask error') as Error & {
        info: {
          error: { code: number; message: string }
          payload: { method: string; params: string[]; jsonrpc: string }
        }
      }

      metaMaskError.info = {
        error: { code: 4001, message: 'User rejected: the request' },
        payload: { method: 'eth_sendTransaction', params: [], jsonrpc: '2.0' }
      }

      const result = parseError(metaMaskError)

      expect(result).toBe('Metamask Error: the request')
    })

    it('should handle Error with shortMessage and ABI', () => {
      const mockAbi: Abi = [
        {
          type: 'error',
          name: 'CustomError',
          inputs: []
        }
      ]

      const error = new Error('Contract error') as Error & {
        shortMessage: string
      }
      error.shortMessage = 'revert: Custom error occurred'

      const result = parseError(error, mockAbi)

      expect(result).toBe('Custom error occurred')
    })

    it('should handle non-Error objects', () => {
      const unknownError = { someProperty: 'some value' }
      const result = parseError(unknownError)

      expect(result).toBe('App Error: Looks like something went wrong.')
    })

    it('should handle null or undefined errors', () => {
      expect(parseError(null)).toBe('App Error: Looks like something went wrong.')
      expect(parseError(undefined)).toBe('App Error: Looks like something went wrong.')
    })

    it('should handle string errors', () => {
      const stringError = 'Simple string error'
      const result = parseError(stringError)

      expect(result).toBe('App Error: Looks like something went wrong.')
    })

    it('should handle Error instances without info property', () => {
      const simpleError = new Error('Simple error message')
      const result = parseError(simpleError)

      expect(result).toBe('Simple error message')
    })

    it('should handle Error with malformed info property', () => {
      const errorWithBadInfo = new Error('Error with bad info') as Error & {
        info: unknown
      }
      errorWithBadInfo.info = { badStructure: true }

      const result = parseError(errorWithBadInfo)

      expect(result).toBe('Error with bad info')
    })

    describe('revert reason parsing', () => {
      it('should handle custom error format', () => {
        const mockAbi: Abi = [
          {
            type: 'error',
            name: 'InsufficientBalance',
            inputs: []
          }
        ]

        const error = new Error('Contract error') as Error & {
          shortMessage: string
        }
        error.shortMessage = 'custom error 0x356d5c62'

        const result = parseError(error, mockAbi)

        // Should attempt to parse custom error
        expect(typeof result).toBe('string')
        expect(result).toContain('Contract reverted')
      })

      it('should handle revert message format', () => {
        const error = new Error('Contract error') as Error & {
          shortMessage: string
        }
        error.shortMessage = 'revert: Insufficient funds.'

        const result = parseError(error)

        expect(result).toBe('Insufficient funds')
      })

      it('should fallback to contract reverted for invalid formats', () => {
        const error = new Error('Contract error') as Error & {
          shortMessage: string
        }
        error.shortMessage = 'invalid error format'

        const result = parseError(error)

        expect(result).toBe('Contract reverted')
      })
    })
  })
})

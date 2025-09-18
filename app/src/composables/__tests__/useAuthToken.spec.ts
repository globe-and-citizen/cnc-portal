import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthToken } from '../useAuthToken'

// Mock @vueuse/core
const mockStorageValue = { value: '' }
const mockUseStorage = vi.fn(() => mockStorageValue)

vi.mock('@vueuse/core', () => ({
  useStorage: mockUseStorage
}))

describe('useAuthToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageValue.value = ''
  })

  describe('initialization', () => {
    it('should initialize storage with correct key and default value', () => {
      useAuthToken()

      expect(mockUseStorage).toHaveBeenCalledWith('authToken', '')
    })

    it('should return a computed value', () => {
      const token = useAuthToken()

      expect(token).toBeDefined()
      expect(typeof token.value).toBe('string')
    })
  })

  describe('token retrieval', () => {
    it('should return empty string when no token is stored', () => {
      mockStorageValue.value = ''

      const token = useAuthToken()

      expect(token.value).toBe('')
    })

    it('should return stored token value', () => {
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
      mockStorageValue.value = testToken

      const token = useAuthToken()

      expect(token.value).toBe(testToken)
    })

    it('should be reactive to storage changes', () => {
      const token = useAuthToken()

      // Initially empty
      expect(token.value).toBe('')

      // Update storage value
      mockStorageValue.value = 'new-token-value'

      // Should reflect the change
      expect(token.value).toBe('new-token-value')
    })
  })

  describe('multiple instances', () => {
    it('should return the same storage reference for multiple calls', () => {
      const token1 = useAuthToken()
      const token2 = useAuthToken()

      expect(mockUseStorage).toHaveBeenCalledTimes(2)
      expect(mockUseStorage).toHaveBeenNthCalledWith(1, 'authToken', '')
      expect(mockUseStorage).toHaveBeenNthCalledWith(2, 'authToken', '')
    })

    it('should maintain consistency across multiple instances', () => {
      mockStorageValue.value = 'consistent-token'

      const token1 = useAuthToken()
      const token2 = useAuthToken()

      expect(token1.value).toBe('consistent-token')
      expect(token2.value).toBe('consistent-token')
    })
  })

  describe('edge cases', () => {
    it('should handle null token value', () => {
      mockStorageValue.value = null

      const token = useAuthToken()

      expect(token.value).toBe(null)
    })

    it('should handle undefined token value', () => {
      mockStorageValue.value = undefined

      const token = useAuthToken()

      expect(token.value).toBe(undefined)
    })

    it('should handle numeric token value', () => {
      mockStorageValue.value = 12345 as unknown as string

      const token = useAuthToken()

      expect(token.value).toBe(12345)
    })

    it('should handle boolean token value', () => {
      mockStorageValue.value = true as unknown as string

      const token = useAuthToken()

      expect(token.value).toBe(true)
    })
  })

  describe('computed behavior', () => {
    it('should return a Vue computed ref', () => {
      const token = useAuthToken()

      // Check if it has computed characteristics
      expect(token).toHaveProperty('value')
      expect(token).toHaveProperty('effect')
    })

    it('should update when underlying storage changes', () => {
      const token = useAuthToken()
      const initialValue = token.value

      // Change the storage value
      mockStorageValue.value = 'updated-token'

      // The computed should reflect the change
      expect(token.value).not.toBe(initialValue)
      expect(token.value).toBe('updated-token')
    })

    it('should be read-only (computed)', () => {
      const token = useAuthToken()

      // Attempting to set the computed value should not work
      // This is more of a TypeScript check, but we can verify the structure
      expect(() => {
        // @ts-expect-error - Testing read-only behavior
        token.value = 'should-not-work'
      }).toThrow()
    })
  })

  describe('storage integration', () => {
    it('should use localStorage by default through useStorage', () => {
      useAuthToken()

      // Verify useStorage is called with correct parameters
      expect(mockUseStorage).toHaveBeenCalledWith('authToken', '')
    })

    it('should handle storage key consistently', () => {
      // Call multiple times
      useAuthToken()
      useAuthToken()
      useAuthToken()

      // All calls should use the same key
      expect(mockUseStorage).toHaveBeenCalledTimes(3)
      mockUseStorage.mock.calls.forEach((call) => {
        expect(call[0]).toBe('authToken')
        expect(call[1]).toBe('')
      })
    })
  })
})

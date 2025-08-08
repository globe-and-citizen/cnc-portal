import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useAuth } from '../useAuth'

// Mock dependencies
const mockClearUserData = vi.fn()
const mockPush = vi.fn()
const mockError = ref(null)

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => ({
    clearUserData: mockClearUserData
  }))
}))

vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush
  }))
}))

vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: vi.fn(() => ({
    error: mockError
  }))
}))

vi.mock('@/utils/generalUtil', () => ({
  log: {
    info: vi.fn()
  }
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockError.value = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { isAuthenticated, user } = useAuth()
      
      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBe(null)
    })
  })

  describe('logout', () => {
    it('should clear user data and redirect after 5 seconds', async () => {
      const { logout } = useAuth()
      
      logout()
      
      // Should immediately clear user data
      expect(mockClearUserData).toHaveBeenCalledTimes(1)
      
      // Should not redirect immediately
      expect(mockPush).not.toHaveBeenCalled()
      
      // Fast-forward 5 seconds
      vi.advanceTimersByTime(5000)
      
      // Should redirect to login
      expect(mockPush).toHaveBeenCalledWith({ name: 'login' })
    })

    it('should not redirect before 5 seconds', () => {
      const { logout } = useAuth()
      
      logout()
      
      // Fast-forward 4 seconds
      vi.advanceTimersByTime(4000)
      
      // Should not redirect yet
      expect(mockPush).not.toHaveBeenCalled()
      
      // Fast-forward 1 more second
      vi.advanceTimersByTime(1000)
      
      // Now should redirect
      expect(mockPush).toHaveBeenCalledWith({ name: 'login' })
    })

    it('should clear user data even if redirect fails', () => {
      mockPush.mockImplementation(() => {
        throw new Error('Navigation failed')
      })
      
      const { logout } = useAuth()
      
      logout()
      
      expect(mockClearUserData).toHaveBeenCalledTimes(1)
      
      // Fast-forward to trigger redirect
      expect(() => {
        vi.advanceTimersByTime(5000)
      }).toThrow('Navigation failed')
      
      // User data should still be cleared
      expect(mockClearUserData).toHaveBeenCalledTimes(1)
    })
  })

  describe('validateToken', () => {
    it('should return true when token is valid', async () => {
      mockError.value = null
      
      const { validateToken } = useAuth()
      const result = await validateToken()
      
      expect(result).toBe(true)
    })

    it('should return false when token is invalid', async () => {
      mockError.value = new Error('Unauthorized')
      
      const { validateToken } = useAuth()
      const result = await validateToken()
      
      expect(result).toBe(false)
    })

    it('should return false when validation fails', async () => {
      mockError.value = { message: 'Network error' }
      
      const { validateToken } = useAuth()
      const result = await validateToken()
      
      expect(result).toBe(false)
    })

    it('should handle multiple validation calls', async () => {
      const { validateToken } = useAuth()
      
      // First call - valid token
      mockError.value = null
      expect(await validateToken()).toBe(true)
      
      // Second call - invalid token
      mockError.value = new Error('Token expired')
      expect(await validateToken()).toBe(false)
      
      // Third call - valid token again
      mockError.value = null
      expect(await validateToken()).toBe(true)
    })
  })

  describe('composable return values', () => {
    it('should return all expected properties and methods', () => {
      const auth = useAuth()
      
      expect(auth).toHaveProperty('isAuthenticated')
      expect(auth).toHaveProperty('user')
      expect(auth).toHaveProperty('logout')
      expect(auth).toHaveProperty('validateToken')
      
      expect(typeof auth.logout).toBe('function')
      expect(typeof auth.validateToken).toBe('function')
    })

    it('should return reactive refs for state', () => {
      const { isAuthenticated, user } = useAuth()
      
      // Should be reactive refs
      expect(typeof isAuthenticated.value).toBe('boolean')
      expect(user.value).toBe(null)
      
      // Should be mutable
      isAuthenticated.value = true
      expect(isAuthenticated.value).toBe(true)
    })
  })
})
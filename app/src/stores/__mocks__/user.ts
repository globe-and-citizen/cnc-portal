import { vi } from 'vitest'
import { ref } from 'vue'

export const useUserDataStore = vi.fn().mockReturnValue({
  name: ref(''),
  address: ref(''),
  nonce: ref(''),
  isAuth: ref(false),
  setUserData: vi.fn(),
  clearUserData: vi.fn(),
  setAuthStatus: vi.fn()
})

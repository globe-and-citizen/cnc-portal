import { vi } from 'vitest'
import { ref } from 'vue'

export const useUserDataStore = vi.fn().mockReturnValue({
  name: 'Owner',
  address: '0xOwner',
  nonce: '',
  isAuth: ref(false),
  setUserData: vi.fn(),
  clearUserData: vi.fn(),
  setAuthStatus: vi.fn()
})

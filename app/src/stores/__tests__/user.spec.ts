import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'

// Unmock the store files so we can test the real implementation
vi.unmock('@/stores/user')

// import { nextTick } from 'vue'
// import { useStorage } from '@vueuse/core'
import { useUserDataStore } from '@/stores/user'

describe('User Data Store', () => {
  it('stores the user identity and nonce', () => {
    setActivePinia(createPinia())
    const userStore = useUserDataStore()
    const name = 'John Doe'
    const address = '0x123456789'
    const nonce = '123'

    userStore.setUserData(name, address, nonce, '')

    expect(userStore.name).toBe(name)
    expect(userStore.address).toBe(address)
    expect(userStore.nonce).toBe(nonce)
  })

  it('clears the stored user identity and nonce', () => {
    const userStore = useUserDataStore()
    const name = 'John Doe'
    const address = '0x123456789'
    const nonce = '123'

    userStore.setUserData(name, address, nonce, '')
    userStore.clearUserData()

    expect(userStore.name).toBe('')
    expect(userStore.address).toBe('')
    expect(userStore.nonce).toBe('')
  })

  it('stores the authentication status', () => {
    const userStore = useUserDataStore()
    const status = true
    userStore.setAuthStatus(status)
    expect(userStore.isAuth).toBe(status)
  })
})

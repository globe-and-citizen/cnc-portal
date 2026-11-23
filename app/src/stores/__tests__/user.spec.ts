import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Unmock the store files so we can test the real implementation
vi.unmock('@/stores/user')

import { useUserDataStore } from '@/stores/user'

describe('User Data Store', () => {
  const address = '0x123456789'

  let pinia: ReturnType<typeof createPinia>
  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    disposePinia(pinia)
    vi.useRealTimers()
  })

  it('stores the user identity and nonce', () => {
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

  it('requires server confirmation for a persisted token even if the old flag is true', () => {
    localStorage.setItem('isAuth', 'true')
    localStorage.setItem('authToken', 'stored-token')
    localStorage.setItem('ownerAddress', address)
    const userStore = useUserDataStore()

    expect(userStore.isAuth).toBe(false)
    expect(userStore.confirmSession('different-token')).toBe(false)
    expect(userStore.confirmSession('stored-token')).toBe(true)
    expect(userStore.isAuth).toBe(true)
    userStore.setSessionToken('new-token')
    expect(userStore.isAuth).toBe(false)
  })

  it('clears the open session when the confirmed JWT expires', () => {
    vi.useFakeTimers()
    const exp = Math.floor(Date.now() / 1000) + 60
    const payload = btoa(JSON.stringify({ exp })).replace(/=+$/, '')
    const token = `header.${payload}.signature`
    const userStore = useUserDataStore()
    userStore.setUserData('Alice', address, 'nonce', '')
    userStore.setSessionToken(token)

    expect(userStore.confirmSession(token)).toBe(true)
    vi.advanceTimersByTime(exp * 1000 - Date.now() - 1)
    expect(userStore.isAuth).toBe(true)
    vi.advanceTimersByTime(1)
    expect(userStore.isAuth).toBe(false)
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(userStore.address).toBe('')
  })
})

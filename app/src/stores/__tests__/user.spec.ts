import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'

// import { nextTick } from 'vue'
// import { useStorage } from '@vueuse/core'
import { useUserDataStore } from '@/stores/user'

describe('User Data Store', () => {
  it('Should set user data correctly', () => {
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

  it('Should clear user data correctly', () => {
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

  it('Should set authentication status correctly', () => {
    const userStore = useUserDataStore()
    const status = true
    userStore.setAuthStatus(status)
    expect(userStore.isAuth).toBe(status)
  })
})

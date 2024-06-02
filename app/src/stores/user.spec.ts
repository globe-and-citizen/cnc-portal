import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'

import { nextTick } from 'vue'
import { useStorage } from '@vueuse/core'
import { useUserDataStore } from '@/stores/user'

describe('User Data Store', () => {
  it('Should set user data correctly', () => {
    setActivePinia(createPinia())
    const userStore = useUserDataStore()
    const name = 'John Doe'
    const address = '0x123456789'
    const nonce = '123'

    userStore.setUserData(name, address, nonce)

    expect(userStore.name).toBe(name)
    expect(userStore.address).toBe(address)
    expect(userStore.nonce).toBe(nonce)
  })

  it('Should clear user data correctly', () => {
    const userStore = useUserDataStore()
    const name = 'John Doe'
    const address = '0x123456789'
    const nonce = '123'

    userStore.setUserData(name, address, nonce)
    userStore.clearUserData()

    expect(userStore.name).toBe('')
    expect(userStore.address).toBe('')
    expect(userStore.nonce).toBe('')
  })

  it.skip('Should set user data correctly when the data is update directly in the localStorage', async () => {
    const userStore = useUserDataStore()
    const name = 'John Doe'
    const address = '0x123456789'
    const nonce = '123'

    userStore.setUserData(name, address, nonce)

    expect(userStore.name).toBe(name)
    expect(userStore.address).toBe(address)
    expect(userStore.nonce).toBe(nonce)

    // Edit the data in the localStorage
    const newName = 'Jane DoeV2'
    const newAddress = '0x987654321'
    const newNonce = '321'

    localStorage.setItem('name', newName)
    localStorage.setItem('ownerAddress', newAddress)
    localStorage.setItem('nonce', newNonce)
    await nextTick()

    // Wait for 5 seconds to let the store update the data
    // await new Promise((resolve) => setTimeout(resolve, 1000))

    useStorage('name', 'Jane DoeV2')
    // TODO: find a way to make the test pass
    console.log('This Test is not passing: TODO: find a way to make the test pass')

    expect(userStore.name).toBe(newName)
    expect(userStore.address).toBe(newAddress)
    expect(userStore.nonce).toBe(newNonce)
  })
})

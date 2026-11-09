import { defineStore } from 'pinia'
import { useEventListener, useStorage } from '@vueuse/core'
import { computed, onScopeDispose, ref, watch } from 'vue'
import type { Address } from 'viem'

function getTokenExpiry(token: string): number | undefined {
  try {
    const payload = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    if (!payload) return
    const { exp } = JSON.parse(atob(payload))
    if (typeof exp === 'number' && Number.isFinite(exp)) return exp * 1000
  } catch {
    // The backend validates the token. Decoding is only used to schedule expiry.
  }
}

export const useUserDataStore = defineStore('user', () => {
  const userName = useStorage('name', '')
  const userAddress = useStorage<Address>('ownerAddress', '' as Address)
  const userNonce = useStorage('nonce', '')
  const userImageUrl = useStorage('imageUrl', '')
  const token = ref(localStorage.getItem('authToken'))
  useEventListener(window, 'storage', (event) => {
    if (event.storageArea === localStorage && (event.key === 'authToken' || event.key === null)) {
      token.value = localStorage.getItem('authToken')
    }
  })
  const verifiedToken = ref<string | null>(null)
  const isAuth = computed(() => verifiedToken.value !== null && verifiedToken.value === token.value)
  let expiryTimer: ReturnType<typeof setTimeout> | undefined

  watch(
    token,
    () => {
      verifiedToken.value = null
      clearTimeout(expiryTimer)
    },
    { flush: 'sync' }
  )
  onScopeDispose(() => clearTimeout(expiryTimer))

  function setUserData(name: string, address: Address, nonce: string, imageUrl: string) {
    userName.value = name
    userAddress.value = address
    userNonce.value = nonce
    userImageUrl.value = imageUrl
  }

  function setSessionToken(value: string | null) {
    if (value === null) localStorage.removeItem('authToken')
    else localStorage.setItem('authToken', value)
    token.value = value
  }

  function clearUserData() {
    setSessionToken(null)
    setUserData('', '' as Address, '', '')
  }

  function confirmSession(checkedToken: string) {
    if (
      !checkedToken ||
      checkedToken !== token.value ||
      checkedToken !== localStorage.getItem('authToken') ||
      !userAddress.value
    ) {
      return false
    }

    const expiresAt = getTokenExpiry(checkedToken)
    clearTimeout(expiryTimer)
    if (expiresAt !== undefined) {
      const remaining = expiresAt - Date.now()
      if (remaining <= 0) {
        clearUserData()
        return false
      }
      expiryTimer = setTimeout(() => {
        if (localStorage.getItem('authToken') === checkedToken) clearUserData()
        else token.value = localStorage.getItem('authToken')
      }, remaining)
    }
    verifiedToken.value = checkedToken
    return true
  }

  return {
    name: userName,
    address: userAddress,
    nonce: userNonce,
    imageUrl: userImageUrl,
    token,
    isAuth,
    setUserData,
    setSessionToken,
    clearUserData,
    confirmSession
  }
})

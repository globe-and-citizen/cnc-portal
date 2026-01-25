import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTradingSessionStore } from '@/stores'

describe('Trading Session Store (In-Memory Vault)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mockSession = {
    eoaAddress: '0x123',
    apiCredentials: {
      key: 'test-key',
      secret: 'test-secret',
      passphrase: 'test-passphrase'
    }
    // ... rest of mock session
  }

  it('should preserve apiCredentials in memory', () => {
    const store = useTradingSessionStore()
    const address = '0x123'

    // @ts-expect-error (if using strict partials)
    store.saveSession(address, mockSession)

    const savedSession = store.loadSession(address)

    // Verify credentials ARE present
    expect(savedSession?.apiCredentials).toBeDefined()
    expect(savedSession?.apiCredentials?.key).toBe('test-key')
  })

  it('should handle case-insensitive session retrieval with credentials', () => {
    const store = useTradingSessionStore()

    // @ts-expect-error (if using strict partials)
    store.saveSession('0xABC', mockSession)

    const loaded = store.loadSession('0xabc')
    expect(loaded?.apiCredentials?.secret).toBe('test-secret')
  })

  it('should completely remove session and credentials on clearSession', () => {
    const store = useTradingSessionStore()
    const address = '0x123'

    // @ts-expect-error (if using strict partials)
    store.saveSession(address, mockSession)
    store.clearSession(address)

    expect(store.loadSession(address)).toBeNull()
  })
})

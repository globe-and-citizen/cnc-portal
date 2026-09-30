import { afterEach, describe, expect, it, vi } from 'vitest'
import { E2E_SAFE_TX_SERVICE_URL } from '@/e2e/chain'

describe('TX_SERVICE_BY_CHAIN', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('registers the local transaction service for the E2E Hardhat chain', async () => {
    vi.stubEnv('VITE_E2E', 'true')
    vi.resetModules()
    const { TX_SERVICE_BY_CHAIN } = await import('../safe')

    expect(TX_SERVICE_BY_CHAIN[31337]).toEqual({
      chain: 'hardhat',
      url: E2E_SAFE_TX_SERVICE_URL,
      nativeSymbol: 'GO'
    })
  })
})

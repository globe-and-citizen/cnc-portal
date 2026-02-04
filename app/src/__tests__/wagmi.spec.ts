import { describe, it, expect, vi } from 'vitest'

vi.unmock('@/wagmi.config')

import { mainnet, sepolia, polygon, hardhat, polygonAmoy } from '@wagmi/vue/chains'
import { config } from '@/wagmi.config'

describe('wagmi.config.ts', () => {
  it('should create a config with the correct chains', () => {
    // Verify the config has all expected chains
    expect(config.chains).toEqual([mainnet, sepolia, polygon, hardhat, polygonAmoy])
  })

  it('should have transports configured for each chain', () => {
    // Verify transports exist for all chains
    expect(config._internal.transports[mainnet.id]).toBeDefined()
    expect(config._internal.transports[sepolia.id]).toBeDefined()
    expect(config._internal.transports[polygon.id]).toBeDefined()
    expect(config._internal.transports[hardhat.id]).toBeDefined()
    expect(config._internal.transports[polygonAmoy.id]).toBeDefined()
  })
})

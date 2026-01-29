import { describe, it, expect } from 'vitest'
import { createConfig, http } from '@wagmi/vue'
import { mainnet, sepolia, polygon, hardhat, polygonAmoy } from '@wagmi/vue/chains'
import { config } from '../wagmi.config'

describe('wagmi.config.ts', () => {
  it('should create a config with the correct chains and transports', () => {
    expect(createConfig).toHaveBeenCalledWith({
      chains: [mainnet, sepolia, polygon, hardhat, polygonAmoy],
      transports: {
        [mainnet.id]: 'mocked-http-transport',
        [sepolia.id]: 'mocked-http-transport',
        [polygon.id]: 'mocked-http-transport',
        [hardhat.id]: 'mocked-http-transport',
        [polygonAmoy.id]: 'mocked-http-transport'
      }
    })

    // Verify the http transport was called for each chain
    expect(http).toHaveBeenCalledTimes(5)

    // Check the content of the created config
    expect(config.chains).toEqual([mainnet, sepolia, polygon, hardhat, polygonAmoy])
    expect(config._internal.transports[mainnet.id]).toBe('mocked-http-transport')
    expect(config._internal.transports[sepolia.id]).toBe('mocked-http-transport')
    expect(config._internal.transports[polygon.id]).toBe('mocked-http-transport')
    expect(config._internal.transports[hardhat.id]).toBe('mocked-http-transport')
    expect(config._internal.transports[polygonAmoy.id]).toBe('mocked-http-transport')
  })
})

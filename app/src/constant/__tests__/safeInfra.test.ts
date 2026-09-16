import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetNetwork } = vi.hoisted(() => ({
  mockGetNetwork: vi.fn()
}))

vi.mock('../network', () => ({
  getNetwork: mockGetNetwork
}))

vi.mock('@/artifacts/deployed_addresses/chain-31337.json', () => ({
  default: {
    'SafeInfraModule#SafeL2': '0x1111111111111111111111111111111111111111',
    'SafeInfraModule#SafeProxyFactory': '0x2222222222222222222222222222222222222222',
    'SafeInfraModule#CompatibilityFallbackHandler': '0x3333333333333333333333333333333333333333'
  }
}))

describe('getSafeInfraAddresses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the deployed Hardhat addresses on chain 31337 outside E2E', async () => {
    mockGetNetwork.mockReturnValue({ chainId: '0x7A69' })
    const { getSafeInfraAddresses } = await import('../safeInfra')

    expect(getSafeInfraAddresses()).toEqual({
      singleton: '0x1111111111111111111111111111111111111111',
      proxyFactory: '0x2222222222222222222222222222222222222222',
      fallbackHandler: '0x3333333333333333333333333333333333333333'
    })
  })

  it('returns the Playwright Safe infrastructure on the E2E Hardhat node', async () => {
    vi.stubEnv('VITE_E2E', 'true')
    mockGetNetwork.mockReturnValue({ chainId: '0x7A69' })
    const [{ getSafeInfraAddresses }, { E2E_SAFE_INFRA }] = await Promise.all([
      import('../safeInfra'),
      import('@/e2e/chain')
    ])

    expect(getSafeInfraAddresses()).toEqual(E2E_SAFE_INFRA)
  })

  it('returns the canonical Polygon addresses on chain 137', async () => {
    mockGetNetwork.mockReturnValue({ chainId: '0x89' })
    const { getSafeInfraAddresses } = await import('../safeInfra')

    expect(getSafeInfraAddresses()).toEqual({
      singleton: '0x29fcB43b46531BcA003ddC8FCB67FFE91900C762',
      proxyFactory: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
      fallbackHandler: '0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99'
    })
  })

  it('throws for an unsupported chain', async () => {
    mockGetNetwork.mockReturnValue({ chainId: '0x1' })
    const { getSafeInfraAddresses } = await import('../safeInfra')

    expect(() => getSafeInfraAddresses()).toThrow(/chain 1/)
  })
})

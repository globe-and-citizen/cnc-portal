import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetNetwork } = vi.hoisted(() => ({
  mockGetNetwork: vi.fn()
}))

vi.mock('../network', () => ({
  getNetwork: mockGetNetwork
}))

describe('Contract Address Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should use the configured Polygon token addresses', async () => {
    mockGetNetwork.mockReturnValue({
      chainId: '0x89',
      networkName: 'Polygon',
      rpcUrl: 'https://polygon-rpc.com',
      currencySymbol: 'MATIC'
    })

    const { USDC_ADDRESS, USDC_E_ADDRESS, USDT_ADDRESS } = await import('../index')

    expect(USDC_ADDRESS).toBe('0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359')
    expect(USDC_E_ADDRESS).toBe('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174')
    expect(USDT_ADDRESS).toBe('0xc2132D05D31c914a87C6611C10748AEb04B58e8F')
  })
})

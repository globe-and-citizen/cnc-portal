import { QueryClient } from '@tanstack/vue-query'
import { describe, expect, it, vi } from 'vitest'
import { fetchAssetMarket } from '../assetMarket.queries'

const address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
describe('contract asset market discovery', () => {
  it('selects the price by platform and verified contract address', async () => {
    const request = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: 'aave-v3-weth',
        platforms: { 'polygon-pos': address },
        market_data: { current_price: { usd: 3000 } }
      })
    }))
    await expect(fetchAssetMarket(client(), { chainId: 137, address }, request)).resolves.toEqual({
      coinId: 'aave-v3-weth',
      priceUsd: 3000
    })
    expect(request.mock.calls[0]?.[0]).toContain(`/polygon-pos/contract/${address}`)
  })
  it('rejects a similarly named asset on a different contract', async () => {
    await expect(
      fetchAssetMarket(client(), { chainId: 137, address }, async () => ({
        ok: true,
        json: async () => ({
          id: 'ethereum',
          platforms: { 'polygon-pos': '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }
        })
      }))
    ).rejects.toThrow('Asset market contract mismatch')
  })
  it('retains coin identity with unavailable price instead of returning zero', async () => {
    await expect(
      fetchAssetMarket(client(), { chainId: 137, address }, async () => ({
        ok: true,
        json: async () => ({ id: 'token', platforms: { 'polygon-pos': address } })
      }))
    ).resolves.toEqual({ coinId: 'token', priceUsd: null })
  })
  it('keeps unsupported network markets unavailable', async () => {
    await expect(fetchAssetMarket(client(), { chainId: 999, address })).rejects.toThrow(
      'Asset market network unavailable'
    )
  })
  it('returns the logo from the verified contract metadata without requiring a price', async () => {
    const logoUri = 'https://assets.example/dai.png'
    await expect(
      fetchAssetMarket(client(), { chainId: 137, address }, async () => ({
        ok: true,
        json: async () => ({
          id: 'dai',
          platforms: { 'polygon-pos': address },
          image: { small: logoUri }
        })
      }))
    ).resolves.toEqual({ coinId: 'dai', priceUsd: null, logoUri })
  })
})

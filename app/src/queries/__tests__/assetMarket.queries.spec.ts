import { QueryClient } from '@tanstack/vue-query'
import { describe, expect, it, vi } from 'vitest'
import externalApiClient from '@/lib/external.axios'
import { fetchAssetMarket } from '../coingecko.queries'

const address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
describe('contract asset market discovery', () => {
  it('reads verified market data through the external Axios client with cancellation', async () => {
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({
      data: {
        id: 'asset',
        platforms: { 'polygon-pos': address },
        market_data: { current_price: { usd: 2 } }
      }
    })
    try {
      await expect(fetchAssetMarket(client(), { chainId: 137, address })).resolves.toEqual({
        coinId: 'asset',
        priceUsd: 2
      })
      expect(get).toHaveBeenCalledWith(
        expect.stringContaining(`/polygon-pos/contract/${address}`),
        { signal: expect.any(AbortSignal) }
      )
    } finally {
      get.mockRestore()
    }
  })

  it('shares the price for five minutes across concurrent and later callers', async () => {
    vi.useFakeTimers()
    const cache = client()
    const request = vi.fn(async () => ({
      data: {
        id: 'asset',
        platforms: { 'polygon-pos': address },
        market_data: { current_price: { usd: 2 } }
      }
    }))
    try {
      await Promise.all([
        fetchAssetMarket(cache, { chainId: 137, address }, request),
        fetchAssetMarket(cache, { chainId: 137, address: address.toUpperCase() }, request)
      ])
      await vi.advanceTimersByTimeAsync(299_999)
      await fetchAssetMarket(cache, { chainId: 137, address }, request)
      expect(request).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1)
      await fetchAssetMarket(cache, { chainId: 137, address }, request)
      expect(request).toHaveBeenCalledTimes(2)
    } finally {
      cache.clear()
      vi.useRealTimers()
    }
  })
  it('selects the price by platform and verified contract address', async () => {
    const request = vi.fn(async () => ({
      data: {
        id: 'aave-v3-weth',
        platforms: { 'polygon-pos': address },
        market_data: { current_price: { usd: 3000 } }
      }
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
        data: {
          id: 'ethereum',
          platforms: { 'polygon-pos': '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }
        }
      }))
    ).rejects.toThrow('Asset market contract mismatch')
  })
  it('retains coin identity with unavailable price instead of returning zero', async () => {
    await expect(
      fetchAssetMarket(client(), { chainId: 137, address }, async () => ({
        data: { id: 'token', platforms: { 'polygon-pos': address } }
      }))
    ).resolves.toEqual({ coinId: 'token', priceUsd: null })
  })
  it.each([31337, 80002, 11155111, 1, 42161, 10, 8453, 999])(
    'keeps non-Polygon contract markets unavailable without contacting the provider: %s',
    async (chainId) => {
      const request = vi.fn()
      await expect(fetchAssetMarket(client(), { chainId, address }, request)).rejects.toThrow(
        'Asset market network unavailable'
      )
      expect(request).not.toHaveBeenCalled()
    }
  )
  it('returns the logo from the verified contract metadata without requiring a price', async () => {
    const logoUri = 'https://assets.example/dai.png'
    await expect(
      fetchAssetMarket(client(), { chainId: 137, address }, async () => ({
        data: {
          id: 'dai',
          platforms: { 'polygon-pos': address },
          image: { small: logoUri }
        }
      }))
    ).resolves.toEqual({ coinId: 'dai', priceUsd: null, logoUri })
  })
})

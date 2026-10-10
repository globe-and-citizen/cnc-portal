import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toValue } from 'vue'
import externalApiClient from '@/lib/external.axios'
import { useQueriesFn } from '@/tests/mocks/composables.mock'
import { useGetAssetMarketsQuery } from '../coingecko.queries'

const address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const query = () => toValue(useQueriesFn.mock.calls.at(-1)![0].queries)[0]!

describe('CoinGecko contract endpoint queries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('preserves raw contract metadata and forwards cancellation', async () => {
    const body = { id: 'asset', platforms: { 'polygon-pos': address } }
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: body })
    const signal = new AbortController().signal
    useGetAssetMarketsQuery([{ chainId: 137, address: address.toUpperCase() }])
    try {
      expect(query().queryKey).toEqual(['asset-market', 137, address])
      expect(await query().queryFn({ signal })).toBe(body)
      expect(get).toHaveBeenCalledWith(
        `https://api.coingecko.com/api/v3/coins/polygon-pos/contract/${address}`,
        { signal }
      )
    } finally {
      get.mockRestore()
    }
  })

  it.each([31337, 80002, 11155111, 1, 42161, 10, 8453, 999])(
    'disables contract discovery for an unsupported chain %s',
    (chainId) => {
      useGetAssetMarketsQuery([{ chainId, address }])
      expect(query().enabled).toBe(false)
    }
  )
})

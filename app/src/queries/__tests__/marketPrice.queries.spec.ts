import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toValue } from 'vue'
import { useQueryFn } from '@/tests/mocks'
import apiClient from '@/lib/axios'
import { useMarketPricesQuery } from '../marketPrice.queries'
import { createPinia, setActivePinia } from 'pinia'
import { useUserDataStore } from '@/stores/user'

vi.unmock('@/stores/user')

describe('Batched current market prices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })
  it('waits for the authenticated session and enables prices after login', () => {
    useMarketPricesQuery(['ethereum'], ['USD'])
    const options = useQueryFn.mock.calls.at(-1)![0]
    expect(toValue(options.enabled)).toBe(false)
    useUserDataStore().setAuthStatus(true)
    expect(toValue(options.enabled)).toBe(true)
  })
  it('requests one deduplicated price batch for supported coin IDs and currencies', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { 'usd-coin': { usd: 1 } } })
    useMarketPricesQuery(['usd-coin', 'ethereum', 'usd-coin'], ['USD', 'EUR', 'USD'])
    const options = useQueryFn.mock.calls.at(-1)![0]
    expect(toValue(options.queryKey)).toEqual([
      'market-prices',
      { ids: ['ethereum', 'usd-coin'], currencies: ['eur', 'usd'] }
    ])
    expect(await options.queryFn({ signal: new AbortController().signal })).toEqual({
      'usd-coin': { usd: 1 }
    })
    expect(apiClient.get).toHaveBeenCalledOnce()
    expect(apiClient.get).toHaveBeenCalledWith(
      'external/market/simple/price?ids=ethereum%2Cusd-coin&vs_currencies=eur%2Cusd',
      expect.objectContaining({ providerManaged: true })
    )
  })
})

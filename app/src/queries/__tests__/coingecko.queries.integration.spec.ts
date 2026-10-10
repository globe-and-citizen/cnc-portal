import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { computed, defineComponent, h, nextTick, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import externalApiClient from '@/lib/external.axios'
import type { HistoricalRateTarget } from '@/utils/accounting/toUsd'
import { coinGeckoRateOfRecord, coinGeckoRateTargets } from '@/utils/tokens/coingecko'
import type { AssetId } from '@/utils/tokens/assets'

vi.unmock('@tanstack/vue-query')
const {
  historicalTokenRateKeys,
  useGetTokenPriceQuery,
  useGetAssetMarketsQuery,
  useGetHistoricalTokenRatesQuery
} = await import('@/queries/coingecko.queries')

const address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const at = (date: string) => new Date(`${date}T23:59:59Z`)
const response = (usd: unknown) => ({ data: { market_data: { current_price: { usd } } } })
const settle = async () => {
  await vi.advanceTimersByTimeAsync(0)
  await nextTick()
  await vi.advanceTimersByTimeAsync(0)
}

describe('Accounting historical rates with real TanStack observers', () => {
  let cache: QueryClient
  const wrappers: ReturnType<typeof mount>[] = []
  beforeEach(() => {
    vi.useFakeTimers()
    cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })
  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
    cache.clear()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  const start = (
    targets: MaybeRefOrGetter<readonly HistoricalRateTarget[]>,
    enabled: MaybeRefOrGetter<boolean> = true
  ) => {
    let markets!: ReturnType<typeof useGetAssetMarketsQuery>
    let history!: ReturnType<typeof useGetHistoricalTokenRatesQuery>
    let plan!: ReturnType<typeof computed<ReturnType<typeof coinGeckoRateTargets>>>
    wrappers.push(
      mount(
        defineComponent({
          setup() {
            markets = useGetAssetMarketsQuery(
              () => coinGeckoRateTargets(toValue(targets)).assets,
              enabled
            )
            plan = computed(() => coinGeckoRateTargets(toValue(targets), markets.value))
            history = useGetHistoricalTokenRatesQuery(() => plan.value.requests, enabled)
            return () => h('div')
          }
        }),
        { global: { plugins: [[VueQueryPlugin, { queryClient: cache }]] } }
      )
    )
    return {
      markets,
      history,
      rateOfRecord: (token: AssetId, at: Date) =>
        coinGeckoRateOfRecord(plan.value.targets, history.value, token, at)
    }
  }

  it('shares unchanged raw snapshots across concurrent consumers and later dates', async () => {
    const body = response(0.123456789)
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValue(body)
    const targets = ref<HistoricalRateTarget[]>([{ token: 'native', date: '2026-03-13' }])
    const first = start(targets)
    const second = start(targets)
    await settle()
    expect(get).toHaveBeenCalledTimes(1)
    expect(first.rateOfRecord('native', at('2026-03-13'))).toBe(0.123457)
    expect(second.rateOfRecord('native', at('2026-03-13'))).toBe(0.123457)
    expect(cache.getQueryData(historicalTokenRateKeys.rate('ethereum', '2026-03-13'))).toBe(
      body.data
    )
    await vi.advanceTimersByTimeAsync(2 * 24 * 60 * 60_000)
    targets.value.push({ token: 'native', date: '2026-03-14' })
    await settle()
    expect(get).toHaveBeenCalledTimes(2)
    expect(first.rateOfRecord('native', at('2026-03-14'))).toBe(0.123457)
  })

  it('never attributes a previous snapshot to a newly requested date', async () => {
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValue(response(0.5))
    const targets = ref<HistoricalRateTarget[]>([{ token: 'native', date: '2026-03-13' }])
    const rates = start(targets)
    await settle()
    expect(rates.rateOfRecord('native', at('2026-03-13'))).toBe(0.5)
    get.mockImplementation(() => new Promise(() => undefined))
    targets.value = [{ token: 'native', date: '2026-03-14' }]
    expect(rates.rateOfRecord('native', at('2026-03-14'))).toBe(0)
    await settle()
    expect(rates.rateOfRecord('native', at('2026-03-14'))).toBe(0)
  })

  it('keeps a throttled date as a gap and refreshes it without replaying successful dates', async () => {
    let throttled = true
    const get = vi.spyOn(externalApiClient, 'get').mockImplementation(async (_url, config) => {
      if (config?.params.date === '2026-03-14' && throttled) throw { response: { status: 429 } }
      return response(config?.params.date === '2026-03-13' ? 0.5 : 0.75)
    })
    const rates = start([
      { token: 'native', date: '2026-03-13' },
      { token: 'native', date: '2026-03-14' },
      { token: 'native', date: '2026-03-15' }
    ])
    await settle()
    expect(get).toHaveBeenCalledTimes(3)
    expect(rates.rateOfRecord('native', at('2026-03-13'))).toBe(0.5)
    expect(rates.rateOfRecord('native', at('2026-03-14'))).toBe(0)
    expect(rates.rateOfRecord('native', at('2026-03-15'))).toBe(0.75)
    expect(rates.history.value.some((query) => query.isFetching)).toBe(false)
    await vi.advanceTimersByTimeAsync(120_000)
    expect(get).toHaveBeenCalledTimes(3)
    throttled = false
    await rates.history.value.find((query) => query.date === '2026-03-14')!.refetch()
    expect(get).toHaveBeenCalledTimes(4)
    expect(rates.rateOfRecord('native', at('2026-03-14'))).toBe(0.75)
  })

  it('discovers each contract once and validates identity before fetching historical dates', async () => {
    const get = vi.spyOn(externalApiClient, 'get').mockImplementation(async (url) =>
      String(url).includes('/contract/')
        ? {
            data: { id: 'asset', platforms: { 'polygon-pos': address } }
          }
        : response(2)
    )
    const token = `erc20:137:${address}` as const
    const rates = start([
      { token, date: '2026-03-13' },
      { token, date: '2026-03-14' },
      { token, date: '2026-03-13' }
    ])
    await settle()
    expect(get).toHaveBeenCalledTimes(3)
    expect(get.mock.calls.filter(([url]) => String(url).includes('/contract/'))).toHaveLength(1)
    expect(rates.rateOfRecord(token, at('2026-03-13'))).toBe(2)
    expect(rates.rateOfRecord(token, at('2026-03-14'))).toBe(2)
  })

  it('withholds historical prices for mismatched metadata and recovers on explicit refresh', async () => {
    let matches = false
    const get = vi.spyOn(externalApiClient, 'get').mockImplementation(async (url) =>
      String(url).includes('/contract/')
        ? {
            data: { id: 'asset', platforms: { 'polygon-pos': matches ? address : '0xbb' } }
          }
        : response(2)
    )
    const token = `erc20:137:${address}` as const
    const rates = start([{ token, date: '2026-03-13' }])
    await settle()
    expect(get).toHaveBeenCalledTimes(1)
    expect(rates.rateOfRecord(token, at('2026-03-13'))).toBe(0)
    matches = true
    expect(rates.markets.value[0]!.isError).toBe(true)
    await rates.markets.value[0]!.refetch()
    await settle()
    expect(get).toHaveBeenCalledTimes(3)
    expect(rates.rateOfRecord(token, at('2026-03-13'))).toBe(2)
  })

  it('keeps unsupported networks unavailable without contacting the provider', async () => {
    const get = vi.spyOn(externalApiClient, 'get')
    const token = `erc20:31337:${address}` as const
    const rates = start([{ token, date: '2026-03-13' }])
    await settle()
    expect(get).not.toHaveBeenCalled()
    expect(rates.rateOfRecord(token, at('2026-03-13'))).toBe(0)
    expect(rates.markets.value.some((query) => query.isFetching)).toBe(false)
  })

  it('recovers malformed historical prices without inventing a current-price fallback', async () => {
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockResolvedValueOnce(response(undefined))
      .mockResolvedValueOnce(response(0.8))
    const rates = start([{ token: 'native', date: '2026-03-13' }])
    await settle()
    expect(rates.rateOfRecord('native', at('2026-03-13'))).toBe(0)
    expect(rates.history.value[0]!.isError).toBe(true)
    await rates.history.value[0]!.refetch()
    expect(rates.rateOfRecord('native', at('2026-03-13'))).toBe(0.8)
    expect(get.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      '/api/v3/coins/ethereum/history',
      '/api/v3/coins/ethereum/history'
    ])
  })

  it('keeps historical queries disabled until the caller enables them', async () => {
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValue(response(1))
    const enabled = ref(false)
    const rates = start([{ token: 'native', date: '2026-03-13' }], enabled)
    await settle()
    expect(get).not.toHaveBeenCalled()
    enabled.value = true
    await settle()
    expect(get).toHaveBeenCalledTimes(1)
    expect(rates.rateOfRecord('native', at('2026-03-13'))).toBe(1)
  })

  it('keeps current-price failures independent from historical queries', async () => {
    const get = vi.spyOn(externalApiClient, 'get').mockImplementation(async (url) => {
      if (!String(url).endsWith('/history')) throw { response: { status: 429 } }
      return response(0.75)
    })
    wrappers.push(
      mount(
        defineComponent({
          setup() {
            useGetTokenPriceQuery('ethereum')
            return () => h('div')
          }
        }),
        { global: { plugins: [[VueQueryPlugin, { queryClient: cache }]] } }
      )
    )
    const rates = start([{ token: 'native', date: '2026-03-13' }])
    await settle()
    expect(get).toHaveBeenCalledTimes(2)
    expect(rates.rateOfRecord('native', at('2026-03-13'))).toBe(0.75)
  })
})

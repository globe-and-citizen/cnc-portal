import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import { computed, defineComponent, h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { SUPPORTED_TOKENS } from '@/constant'
import externalApiClient from '@/lib/external.axios'
import { useCurrencyStore as useMockedCurrencyStore } from '@/stores'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockTeamStore } from '@/tests/mocks'
import { useTransactionPresentation } from '@/composables/transactions/useTransactionPresentation'
import { formatCurrencyShort } from '@/utils/currency/display'
import TokenPriceStatusAlert from '@/components/ui/TokenPriceStatusAlert.vue'

const { useCurrencyStore } =
  await vi.importActual<typeof import('../currencyStore')>('../currencyStore')
const { useQuery } =
  await vi.importActual<typeof import('@tanstack/vue-query')>('@tanstack/vue-query')
const native = SUPPORTED_TOKENS.find(({ id }) => id === 'native')!
const quote = (usd = 2, eur = 3) => ({
  market_data: { current_price: { usd, eur, cad: 4, idr: 5, inr: 6 } }
})
let wrapper: VueWrapper
let client: QueryClient
let store: ReturnType<typeof useCurrencyStore>

function setup() {
  wrapper = mount(
    defineComponent({
      setup() {
        store = useCurrencyStore()
        vi.mocked(useMockedCurrencyStore).mockReturnValue(store)
        const { enrichTransaction } = useTransactionPresentation()
        const row = computed(() =>
          enrichTransaction({ amount: '2', tokenAddress: native.address, token: native.symbol })
        )
        return () =>
          h('div', [
            h(TokenPriceStatusAlert),
            h(
              'span',
              { 'data-test': 'fiat-value' },
              formatCurrencyShort(row.value.amountLocal, store.localCurrency.code)
            )
          ])
      }
    }),
    { global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient: client }]] } }
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useQueryFn.mockImplementation(useQuery)
  mockTeamStore.getInvestorAddress.mockReturnValue('0x1111111111111111111111111111111111111111')
})
afterEach(() => {
  wrapper?.unmount()
  store?.$dispose()
  client.clear()
  vi.restoreAllMocks()
})

describe('real currency queries, store, presentation and recovery UI', () => {
  it('[AC-US-BANK-003-10] keeps a failed quote unavailable and retries only failed observers through Try again', async () => {
    let fail = true
    const get = vi.spyOn(externalApiClient, 'get').mockImplementation(async (url) => {
      if (url.endsWith('/' + native.coingeckoId) && fail) throw new Error('Price unavailable')
      return { data: quote() }
    })
    setup()
    await vi.waitFor(() =>
      expect(wrapper.find('[data-test="token-price-retry"]').exists()).toBe(true)
    )
    expect(store.getTokenPrice('native')).toBeNull()
    expect(store.getTokenInfo('native')?.prices.find(({ id }) => id === 'local')?.price).toBeNull()
    expect(wrapper.get('[data-test="fiat-value"]').text()).toBe('—')
    const counts = get.mock.calls.map(([url]) => url)
    fail = false
    await wrapper.get('[data-test="token-price-retry"]').trigger('click')
    await vi.waitFor(() => expect(store.getTokenPrice('native')).toBe(2))
    expect(wrapper.get('[data-test="fiat-value"]').text()).toBe('$4')
    expect(wrapper.find('[data-test="token-price-warning"]').exists()).toBe(false)
    expect(get.mock.calls.length).toBe(counts.length + 1)
    expect(get.mock.calls.at(-1)?.[0]).toContain(native.coingeckoId)
  })

  it('retains a cached quote after a refresh failure and exposes that failure until recovery', async () => {
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValue({ data: quote() })
    setup()
    await vi.waitFor(() => expect(store.getTokenPrice('native')).toBe(2))
    get.mockRejectedValueOnce(new Error('Refresh unavailable'))
    await client.refetchQueries({ queryKey: ['price', native.coingeckoId], exact: true })
    await vi.waitFor(() =>
      expect(wrapper.find('[data-test="token-price-warning"]').exists()).toBe(true)
    )
    expect(store.getTokenPrice('native')).toBe(2)
    expect(wrapper.get('[data-test="fiat-value"]').text()).toBe('$4')
    get.mockResolvedValue({ data: quote(5) })
    await wrapper.get('[data-test="token-price-retry"]').trigger('click')
    await vi.waitFor(() => expect(store.getTokenPrice('native')).toBe(5))
    expect(wrapper.get('[data-test="fiat-value"]').text()).toBe('$10')
    expect(wrapper.find('[data-test="token-price-warning"]').exists()).toBe(false)
  })

  it('reprices the real transaction consumer when currency changes without another request', async () => {
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValue({ data: quote() })
    setup()
    await vi.waitFor(() => expect(store.getTokenPrice('native')).toBe(2))
    const requests = get.mock.calls.length
    await store.setCurrency('EUR')
    await nextTick()
    expect(store.getTokenPrice('native')).toBe(3)
    expect(store.getTokenInfo('native')?.prices.find(({ id }) => id === 'local')?.price).toBe(3)
    expect(wrapper.get('[data-test="fiat-value"]').text()).toBe('€6')
    expect(get).toHaveBeenCalledTimes(requests)
  })

  it('preserves true zero and the explicit SHER pricing policy', async () => {
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValue({ data: quote(0, 0) })
    setup()
    await vi.waitFor(() => expect(store.getTokenPrice('native')).toBe(0))
    expect(store.getTokenInfo('native')?.prices.find(({ id }) => id === 'local')?.price).toBe(0)
    expect(wrapper.get('[data-test="fiat-value"]').text()).toBe('$0')
    expect(wrapper.find('[data-test="token-price-warning"]').exists()).toBe(false)
    expect(store.getTokenPrice('sher')).toBe(0)
    expect(store.getTokenInfo('sher')?.prices.every(({ price }) => price === 0)).toBe(true)
    expect(get.mock.calls.some(([url]) => url.includes('sher-token'))).toBe(false)
  })

  it('makes an absent selected-currency quote unavailable even when the USD quote succeeded', async () => {
    vi.spyOn(externalApiClient, 'get').mockResolvedValue({ data: quote() })
    setup()
    await vi.waitFor(() => expect(store.getTokenPrice('native')).toBe(2))
    const body = quote()
    delete (body.market_data.current_price as Partial<typeof body.market_data.current_price>).eur
    client.setQueryData(['price', native.coingeckoId], body)
    await store.setCurrency('EUR')
    await vi.waitFor(() => expect(store.getTokenPrice('native')).toBeNull())
    expect(store.getTokenInfo('native')?.prices.find(({ id }) => id === 'local')?.price).toBeNull()
    expect(wrapper.get('[data-test="fiat-value"]').text()).toBe('—')
    expect(wrapper.find('[data-test="token-price-warning"]').exists()).toBe(true)
  })
})

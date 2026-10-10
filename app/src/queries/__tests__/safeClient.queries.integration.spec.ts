import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { computed, defineComponent, h, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import externalApiClient from '@/lib/external.axios'
import { getSafeFiatTotal, toSafeHoldingRows } from '@/utils/safe/portfolio'
import type { SafeClientBalances } from '@/types/safe'

vi.unmock('@tanstack/vue-query')
const { invalidateSafeQueries } =
  await vi.importActual<typeof import('../safe.mutations')>('../safe.mutations')
const { useGetSafeBalancesQuery, safeClientKeys } =
  await vi.importActual<typeof import('../safeClient.queries')>('../safeClient.queries')
const address = '0x0557f280d9da274254e85ee70c2936694e494275'

describe('Safe Gateway query observers', () => {
  it('cancels an obsolete currency request and keeps late data out of the displayed holdings', async () => {
    const client = new QueryClient()
    const fiatCode = ref('USD')
    const usd: SafeClientBalances = {
      fiatTotal: '100',
      items: [
        {
          tokenInfo: { type: 'ERC20', address, decimals: 6, name: 'Asset', symbol: 'ASSET' },
          balance: '1000000',
          fiatConversion: '100',
          fiatBalance: '100'
        }
      ]
    }
    const eur: SafeClientBalances = {
      fiatTotal: '90',
      items: [{ ...usd.items[0]!, fiatConversion: '90', fiatBalance: '90' }]
    }
    let completeUsd!: () => void
    let usdSignal!: AbortSignal
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockImplementationOnce((_url, config) => {
        usdSignal = config?.signal as AbortSignal
        return new Promise((resolve) => {
          completeUsd = () => resolve({ data: usd })
        })
      })
      .mockResolvedValue({ data: eur })
    const wrapper = mount(
      defineComponent({
        setup() {
          const query = useGetSafeBalancesQuery({
            pathParams: { safeAddress: address, chainId: 137, fiatCode }
          })
          const rows = computed(() => toSafeHoldingRows(query.data.value, fiatCode.value))
          return () => h('div', rows.value.map((row) => row.balanceLabel).join(', '))
        }
      }),
      { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } }
    )
    try {
      await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(1))
      expect(wrapper.text()).toBe('')
      fiatCode.value = 'EUR'
      await vi.waitFor(() => expect(wrapper.text()).toBe('€90'))
      expect(usdSignal.aborted).toBe(true)
      completeUsd()
      await flushPromises()
      expect(wrapper.text()).toBe('€90')
      expect(get).toHaveBeenCalledTimes(2)
      expect(client.getQueryData(safeClientKeys.balances(address, 137, 'USD'))).toBeUndefined()
      expect(client.getQueryData(safeClientKeys.balances(address, 137, 'EUR'))).toEqual(eur)
    } finally {
      wrapper.unmount()
      client.clear()
      get.mockRestore()
    }
  })

  it('shares one request between overview and holdings, and refreshes both through existing operation invalidation', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockResolvedValue({ data: { fiatTotal: '0', items: [] } })
    let overview!: ReturnType<typeof useGetSafeBalancesQuery>
    let holdings!: ReturnType<typeof useGetSafeBalancesQuery>
    const Host = defineComponent({
      setup() {
        overview = useGetSafeBalancesQuery({ pathParams: { safeAddress: address, chainId: 137 } })
        holdings = useGetSafeBalancesQuery({
          pathParams: {
            safeAddress: '0x0557F280D9DA274254e85Ee70c2936694e494275',
            chainId: 137,
            fiatCode: 'usd'
          }
        })
        return () => h('div')
      }
    })
    const wrapper = mount(Host, {
      global: { plugins: [[VueQueryPlugin, { queryClient: client }]] }
    })
    try {
      await vi.waitFor(() => expect(overview.data.value?.fiatTotal).toBe('0'))
      expect(holdings.data.value).toEqual(overview.data.value)
      expect(get).toHaveBeenCalledTimes(1)
      await invalidateSafeQueries(client, address, 137)
      expect(get).toHaveBeenCalledTimes(2)
      expect(getSafeFiatTotal(holdings.data.value)).toBe(0)
    } finally {
      wrapper.unmount()
      client.clear()
      get.mockRestore()
    }
  })

  it('keeps independent currency cache entries and does not show another wallet response after an address change', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockResolvedValue({ data: { fiatTotal: '0', items: [] } })
    const safeAddress = ref<string | undefined>(address)
    const fiatCode = ref('USD')
    let balances!: ReturnType<typeof useGetSafeBalancesQuery>
    const Host = defineComponent({
      setup() {
        balances = useGetSafeBalancesQuery({ pathParams: { safeAddress, chainId: 137, fiatCode } })
        return () => h('div')
      }
    })
    const wrapper = mount(Host, {
      global: { plugins: [[VueQueryPlugin, { queryClient: client }]] }
    })
    try {
      await vi.waitFor(() => expect(balances.data.value).toBeDefined())
      fiatCode.value = 'EUR'
      await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2))
      await vi.waitFor(() =>
        expect(client.getQueryData(safeClientKeys.balances(address, 137, 'EUR'))).toBeDefined()
      )
      expect(client.getQueryData(safeClientKeys.balances(address, 137, 'USD'))).toBeDefined()
      safeAddress.value = undefined
      await vi.waitFor(() => expect(balances.data.value).toBeUndefined())
      expect(get).toHaveBeenCalledTimes(2)
    } finally {
      wrapper.unmount()
      client.clear()
      get.mockRestore()
    }
  })
})

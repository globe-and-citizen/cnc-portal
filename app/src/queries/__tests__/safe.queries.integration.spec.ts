import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { defineComponent, h, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import externalApiClient from '@/lib/external.axios'

vi.unmock('@tanstack/vue-query')
vi.mock('@/constant/index', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/constant/index')>()),
  currentChainId: 137
}))

const safeQueries = await vi.importActual<typeof import('../safe.queries')>('../safe.queries')

describe('Safe query reactivity', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests both Accounting feeds when an asynchronous Safe address resolves', async () => {
    const address = ref<string>()
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValue({
      data: { next: null, results: [] }
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const Host = defineComponent({
      setup() {
        safeQueries.useGetSafeIncomingTransfersQuery({
          pathParams: { safeAddress: address },
          queryParams: { limit: 500 }
        })
        safeQueries.useGetSafeOutgoingTransactionsQuery({
          pathParams: { safeAddress: address },
          queryParams: { limit: 500 }
        })
        return () => h('div')
      }
    })
    const wrapper = mount(Host, {
      global: { plugins: [[VueQueryPlugin, { queryClient }]] }
    })

    await flushPromises()
    expect(get).not.toHaveBeenCalled()

    address.value = '0xFirstSafe'

    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(get.mock.calls.map(([url]) => url)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/safes/0xFirstSafe/incoming-transfers/'),
        expect.stringContaining('/safes/0xFirstSafe/multisig-transactions/')
      ])
    )

    address.value = '0xSecondSafe'

    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(4))
    expect(get.mock.calls.slice(2).map(([url]) => url)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/safes/0xSecondSafe/incoming-transfers/'),
        expect.stringContaining('/safes/0xSecondSafe/multisig-transactions/')
      ])
    )

    wrapper.unmount()
    queryClient.clear()
  })
})

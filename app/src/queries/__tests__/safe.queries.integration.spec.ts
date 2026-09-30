import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { defineComponent, h, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import externalApiClient from '@/lib/external.axios'

const FIRST_LOWERCASE_SAFE_ADDRESS = '0x0557f280d9da274254e85ee70c2936694e494275'
const FIRST_CHECKSUM_SAFE_ADDRESS = '0x0557F280D9DA274254e85Ee70c2936694e494275'
const SECOND_LOWERCASE_SAFE_ADDRESS = '0x52908400098527886e0f7030069857d2e4169ee7'
const SECOND_CHECKSUM_SAFE_ADDRESS = '0x52908400098527886E0F7030069857D2E4169EE7'

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

    address.value = FIRST_LOWERCASE_SAFE_ADDRESS

    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(get.mock.calls.map(([url]) => url)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`/safes/${FIRST_CHECKSUM_SAFE_ADDRESS}/incoming-transfers/`),
        expect.stringContaining(`/safes/${FIRST_CHECKSUM_SAFE_ADDRESS}/multisig-transactions/`)
      ])
    )

    address.value = SECOND_LOWERCASE_SAFE_ADDRESS

    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(4))
    expect(get.mock.calls.slice(2).map(([url]) => url)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`/safes/${SECOND_CHECKSUM_SAFE_ADDRESS}/incoming-transfers/`),
        expect.stringContaining(`/safes/${SECOND_CHECKSUM_SAFE_ADDRESS}/multisig-transactions/`)
      ])
    )

    wrapper.unmount()
    queryClient.clear()
  })
})

import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { defineComponent, h, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import externalApiClient from '@/lib/external.axios'
import type { SafeIncomingTransfer } from '@/types/safe'
import { mockWagmiCore } from '@/tests/mocks/wagmi.vue.mock'
import { discoverSafeAssets } from '@/utils/safe/assetDiscovery'
import { toSafeTransferRows } from '@/utils/accounting/safeTransfers'
import { buildCncJournalEntryDrafts } from '@/utils/accounting/assemble'
import { historicalRateTargets } from '@/utils/accounting/toUsd'

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

  it.each(['cached', 'paginated'] as const)(
    'filters confirmed spam from %s holdings, incoming history and accounting while retaining raw cache evidence',
    async (mode) => {
      const token = '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063'
      const legitimate: SafeIncomingTransfer = {
        transferId: 'legitimate-in',
        type: 'ERC20_TRANSFER',
        tokenAddress: token,
        tokenInfo: { type: 'ERC20', address: token, name: 'Dai', symbol: 'DAI', decimals: 18 },
        transactionHash: '0xmixed',
        executionDate: '2026-10-08T12:14:09Z',
        blockNumber: 1,
        from: SECOND_LOWERCASE_SAFE_ADDRESS,
        to: FIRST_CHECKSUM_SAFE_ADDRESS,
        value: '977545092688764193'
      }
      const spam: SafeIncomingTransfer = {
        ...legitimate,
        transferId: 'counterfeit',
        tokenAddress: '0x0ce89273aadcb0f297a32d957cbd459ed06848ea',
        tokenInfo: undefined
      }
      const outflow: SafeIncomingTransfer = {
        ...legitimate,
        transferId: 'legitimate-out',
        from: FIRST_CHECKSUM_SAFE_ADDRESS,
        to: SECOND_LOWERCASE_SAFE_ADDRESS
      }
      const raw = [spam, legitimate, outflow]
      const rawIncoming = [spam, legitimate]
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const keys = [
        safeQueries.safeKeys.transfers(FIRST_CHECKSUM_SAFE_ADDRESS, 137),
        safeQueries.safeKeys.incomingTransfers(FIRST_CHECKSUM_SAFE_ADDRESS)
      ]
      if (mode === 'cached') {
        client.setQueryData(keys[0]!, raw)
        client.setQueryData(keys[1]!, rawIncoming)
      }
      const get = vi.spyOn(externalApiClient, 'get').mockImplementation(async (url) => ({
        data: String(url).includes('offset=1')
          ? {
              next: null,
              results: String(url).includes('/incoming-transfers/')
                ? [legitimate]
                : [legitimate, outflow]
            }
          : { next: '?offset=1', results: [spam] }
      }))
      mockWagmiCore.readContract.mockClear()
      let transfers!: ReturnType<typeof safeQueries.useGetSafeTransfersQuery>
      let incoming!: ReturnType<typeof safeQueries.useGetSafeIncomingTransfersQuery>
      const Host = defineComponent({
        setup() {
          const params = { pathParams: { safeAddress: FIRST_LOWERCASE_SAFE_ADDRESS } }
          transfers = safeQueries.useGetSafeTransfersQuery(params)
          incoming = safeQueries.useGetSafeIncomingTransfersQuery(params)
          return () => h('div')
        }
      })
      const wrapper = mount(Host, {
        global: { plugins: [[VueQueryPlugin, { queryClient: client }]] }
      })
      try {
        await vi.waitFor(() => {
          expect(transfers.data.value).toEqual([legitimate, outflow])
          expect(incoming.data.value).toEqual([legitimate])
        })
        expect(
          discoverSafeAssets(transfers.data.value!, 137).map((asset) => asset.address)
        ).toEqual([token])
        expect(
          toSafeTransferRows(transfers.data.value, undefined, 137).map((movement) => movement.id)
        ).toEqual(['legitimate-in', 'legitimate-out'])
        const drafts = buildCncJournalEntryDrafts({
          safeAddress: FIRST_CHECKSUM_SAFE_ADDRESS,
          safeAssetTransfers: transfers.data.value
        })
        expect(drafts).toHaveLength(2)
        expect(drafts.map((draft) => draft.rawAmount)).toEqual([legitimate.value, outflow.value])
        expect(drafts.every((draft) => draft.asset?.address === token)).toBe(true)
        expect(historicalRateTargets(drafts).map((target) => target.token)).toEqual([
          `erc20:137:${token}`
        ])
        expect(client.getQueryData(keys[0]!)).toEqual(raw)
        expect(client.getQueryData(keys[1]!)).toEqual(rawIncoming)
        expect(mockWagmiCore.readContract).not.toHaveBeenCalled()
        expect(get).toHaveBeenCalledTimes(mode === 'cached' ? 0 : 4)
      } finally {
        wrapper.unmount()
        client.clear()
      }
    }
  )

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

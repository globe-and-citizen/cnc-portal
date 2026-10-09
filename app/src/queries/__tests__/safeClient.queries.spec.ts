import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue } from 'vue'
import externalApiClient from '@/lib/external.axios'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockWagmiCore } from '@/tests/mocks/wagmi.vue.mock'
import type { SafeClientBalances } from '@/types/safe'
import { safeBalancesTotal } from '@/utils/safe/portfolio'
import { safeKeys } from '../safe.queries'

const { useGetSafeBalancesQuery, safeClientKeys } =
  await vi.importActual<typeof import('../safeClient.queries')>('../safeClient.queries')
const address = '0x0557f280d9da274254e85ee70c2936694e494275'
const checksum = '0x0557F280D9DA274254e85Ee70c2936694e494275'
const capture = () =>
  useQueryFn.mock.calls.at(-1)![0] as {
    queryKey: unknown
    enabled: unknown
    queryFn: (context: { signal: AbortSignal }) => Promise<SafeClientBalances>
    retry: (count: number, error: unknown) => boolean
  }

describe('Safe Client balances query', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches native and ERC-20 holdings and fiat prices in one cancellable HTTP request without RPC reads', async () => {
    const payload: SafeClientBalances = { fiatTotal: '0', items: [] }
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValue({ data: payload })
    useGetSafeBalancesQuery({ pathParams: { safeAddress: address, chainId: 137 } })
    const signal = new AbortController().signal
    await expect(capture().queryFn({ signal })).resolves.toBe(payload)
    expect(get).toHaveBeenCalledExactlyOnceWith(
      `https://safe-client.safe.global/v1/chains/137/safes/${checksum}/balances/USD?exclude_spam=true&trusted=false`,
      { signal }
    )
    expect(mockWagmiCore.readContract).not.toHaveBeenCalled()
  })

  it('rekeys reactively by address, chain and fiat currency under the existing invalidation prefix', () => {
    const safeAddress = ref<string>()
    const chainId = ref(137)
    const fiatCode = ref('usd')
    useGetSafeBalancesQuery({ pathParams: { safeAddress, chainId, fiatCode } })
    const query = capture()
    expect(toValue(query.enabled)).toBe(false)
    safeAddress.value = address
    expect(toValue(query.enabled)).toBe(true)
    expect(toValue(query.queryKey)).toEqual([
      ...safeKeys.balance(checksum, 137),
      'safe-client',
      'USD'
    ])
    chainId.value = 1
    fiatCode.value = 'eur'
    expect(toValue(query.queryKey)).toEqual(safeClientKeys.balances(address, 1, 'EUR'))
  })

  it('does not fabricate an empty wallet from a malformed response', async () => {
    vi.spyOn(externalApiClient, 'get').mockResolvedValue({ data: {} })
    useGetSafeBalancesQuery({ pathParams: { safeAddress: address } })
    await expect(capture().queryFn({ signal: new AbortController().signal })).rejects.toThrow(
      'Safe balances response unavailable'
    )
  })

  it('keeps raw confirmed-spam evidence in the response while omitting it from the valued total', async () => {
    const payload: SafeClientBalances = {
      fiatTotal: '999',
      items: [
        {
          tokenInfo: {
            type: 'ERC20',
            address: '0x0ce89273aadcb0f297a32d957cbd459ed06848ea',
            decimals: 6,
            name: 'USD Coin',
            symbol: 'USDC'
          },
          balance: '1000000',
          fiatConversion: '1',
          fiatBalance: '999'
        }
      ]
    }
    vi.spyOn(externalApiClient, 'get').mockResolvedValue({ data: payload })
    useGetSafeBalancesQuery({ pathParams: { safeAddress: address, chainId: 137 } })
    const data = await capture().queryFn({ signal: new AbortController().signal })
    expect(data.items).toHaveLength(1)
    expect(safeBalancesTotal(data, 137)).toBe(0)
  })

  it('uses active-tab minute refreshes and retries transient errors once without retrying client errors', () => {
    useGetSafeBalancesQuery({ pathParams: { safeAddress: address } })
    const query = capture()
    expect(query).toMatchObject({
      staleTime: 60_000,
      gcTime: 1_800_000,
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retryDelay: 5000
    })
    expect(query.retry(0, { status: 429 })).toBe(false)
    expect(query.retry(0, { status: 404 })).toBe(false)
    expect(query.retry(0, { status: 503 })).toBe(true)
    expect(query.retry(1, { status: 503 })).toBe(false)
  })
})

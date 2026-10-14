import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toValue } from 'vue'
import externalApiClient from '@/lib/external.axios'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockWagmiCore } from '@/tests/mocks/wagmi.vue.mock'
import type { SafeClientBalances } from '@/types/safe'

const { fetchSafeClientBalances, useGetSafeBalancesQuery } =
  await vi.importActual<typeof import('../safeClient.queries')>('../safeClient.queries')
const address = '0x0557f280d9da274254e85ee70c2936694e494275'
const checksum = '0x0557F280D9DA274254e85Ee70c2936694e494275'
const capturedQuery = () => toValue(useQueryFn.mock.calls.at(-1)![0])

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('fetchSafeClientBalances', () => {
  it('requests Gateway balances with the normalized address, fiat currency and cancellation signal', async () => {
    const payload: SafeClientBalances = { fiatTotal: '0', items: [] }
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: payload })
    const signal = new AbortController().signal

    await expect(fetchSafeClientBalances(address, 137, 'usd', signal)).resolves.toBe(payload)
    expect(get).toHaveBeenCalledExactlyOnceWith(
      `https://safe-client.safe.global/v1/chains/137/safes/${checksum}/balances/USD?exclude_spam=true&trusted=false`,
      { signal }
    )
    expect(mockWagmiCore.readContract).not.toHaveBeenCalled()
  })

  it.each([null, {}, { fiatTotal: '0' }, { fiatTotal: 0, items: [] }])(
    'rejects a malformed response: %j',
    async (payload) => {
      vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: payload })

      await expect(fetchSafeClientBalances(address, 137, 'USD')).rejects.toThrow(
        'Safe balances response unavailable'
      )
    }
  )

  it('preserves every returned token and the provider fiat total', async () => {
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
    vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: payload })

    await expect(fetchSafeClientBalances(address, 137, 'USD')).resolves.toBe(payload)
  })

  it('propagates the provider error', async () => {
    const error = new Error('Safe Gateway unavailable')
    vi.spyOn(externalApiClient, 'get').mockRejectedValueOnce(error)

    await expect(fetchSafeClientBalances(address, 137, 'USD')).rejects.toBe(error)
  })
})

describe('useGetSafeBalancesQuery', () => {
  it('passes the caller network and fiat currency to the balance request', async () => {
    const payload: SafeClientBalances = { fiatTotal: '12', items: [] }
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: payload })
    const signal = new AbortController().signal
    useGetSafeBalancesQuery({ pathParams: { safeAddress: address, chainId: 1, fiatCode: 'eur' } })

    await expect(capturedQuery().queryFn({ signal })).resolves.toBe(payload)
    expect(get).toHaveBeenCalledExactlyOnceWith(
      `https://safe-client.safe.global/v1/chains/1/safes/${checksum}/balances/EUR?exclude_spam=true&trusted=false`,
      { signal }
    )
  })

  it.each([
    { safeAddress: address, expected: true },
    { safeAddress: undefined, expected: false },
    { safeAddress: '', expected: false },
    { safeAddress: 'invalid-address', expected: false }
  ])('sets request eligibility for %j', ({ safeAddress, expected }) => {
    useGetSafeBalancesQuery({ pathParams: { safeAddress } })

    expect(toValue(capturedQuery().enabled)).toBe(expected)
  })
})

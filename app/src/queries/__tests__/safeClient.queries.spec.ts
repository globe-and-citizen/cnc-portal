import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue } from 'vue'
import externalApiClient from '@/lib/external.axios'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockWagmiCore } from '@/tests/mocks/wagmi.vue.mock'
import type { SafeClientBalances, SafeClientTransactionHistory } from '@/types/safe'
import { currentChainId } from '@/constant'
import { safeKeys } from '../safe.queries'

const { fetchSafeClientBalances, useGetSafeBalancesQuery, useGetSafeTransactionHistoryQuery } =
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
      `https://safe-client.safe.global/v1/chains/137/safes/${checksum}/balances/USD?exclude_spam=true&trusted=true`,
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
      `https://safe-client.safe.global/v1/chains/1/safes/${checksum}/balances/EUR?exclude_spam=true&trusted=true`,
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

  it('stops refreshing while Safe services answer not found', () => {
    useGetSafeBalancesQuery({ pathParams: { safeAddress: address } })
    const { refetchInterval } = capturedQuery()
    const notFound = Object.assign(new Error('Not found'), { status: 404 })

    expect(refetchInterval({ state: { error: notFound } })).toBe(false)
    expect(refetchInterval({ state: { error: new Error('Gateway unavailable') } })).toBe(60_000)
    expect(refetchInterval({ state: { error: null } })).toBe(60_000)
  })
})

describe('useGetSafeTransactionHistoryQuery', () => {
  it('preserves the raw history page, date labels and transaction details', async () => {
    const payload: SafeClientTransactionHistory = {
      count: null,
      next: 'https://safe-client.safe.global/next-page',
      previous: null,
      results: [
        { type: 'DATE_LABEL', timestamp: 1780315200000 },
        {
          type: 'TRANSACTION',
          conflictType: 'None',
          transaction: {
            id: 'multisig_0xswap',
            txHash: '0xswap',
            timestamp: 1780315200000,
            txStatus: 'SUCCESS',
            txInfo: { type: 'Swap', humanDescription: null, sellAmount: '123456789012345678901' },
            executionInfo: { type: 'MULTISIG', nonce: 7 },
            safeAppInfo: null,
            note: 'Original note'
          }
        }
      ]
    }
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: payload })
    const signal = new AbortController().signal
    const queryParams = {
      cursor: 'opaque-cursor',
      timezone: 'Africa/Lome',
      trusted: false,
      imitation: false
    }
    useGetSafeTransactionHistoryQuery({
      pathParams: { safeAddress: address, chainId: 1 },
      queryParams
    })

    await expect(capturedQuery().queryFn({ signal })).resolves.toBe(payload)
    expect(get).toHaveBeenCalledExactlyOnceWith(
      `https://safe-client.safe.global/v1/chains/1/safes/${checksum}/transactions/history`,
      { signal, params: queryParams }
    )
  })

  it('uses the current chain by default and shares transaction-list invalidations', () => {
    useGetSafeTransactionHistoryQuery({ pathParams: { safeAddress: address } })
    const key = capturedQuery().queryKey
    expect(key.slice(0, 3)).toEqual(safeKeys.transactions(address))
    expect(key.at(-1)).toEqual({ chainId: currentChainId })

    useGetSafeTransactionHistoryQuery({ pathParams: { safeAddress: checksum } })
    expect(capturedQuery().queryKey).toEqual(key)
  })

  it('updates the request and cache identity when reactive parameters change', async () => {
    const safeAddress = ref(address)
    const chainId = ref(137)
    const cursor = ref('first')
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: { results: [] } })
    const signal = new AbortController().signal
    useGetSafeTransactionHistoryQuery({
      pathParams: { safeAddress, chainId },
      queryParams: () => ({ cursor: cursor.value })
    })
    const originalKey = capturedQuery().queryKey
    safeAddress.value = '0x0000000000000000000000000000000000000001'
    chainId.value = 1
    cursor.value = 'next'

    expect(capturedQuery().queryKey).not.toEqual(originalKey)
    await capturedQuery().queryFn({ signal })
    expect(get).toHaveBeenCalledExactlyOnceWith(
      `https://safe-client.safe.global/v1/chains/1/safes/${safeAddress.value}/transactions/history`,
      { signal, params: { cursor: 'next' } }
    )
  })

  it('keeps pages and presentation filters in distinct cache entries', () => {
    const filters = [
      {},
      { cursor: 'next' },
      { timezone: 'Africa/Lome' },
      { trusted: false },
      { imitation: false }
    ]
    const keys = filters.map((queryParams) => {
      useGetSafeTransactionHistoryQuery({
        pathParams: { safeAddress: address, chainId: 137 },
        queryParams
      })
      return JSON.stringify(capturedQuery().queryKey)
    })
    expect(new Set(keys).size).toBe(filters.length)
  })

  it.each([undefined, '', 'invalid-address'])(
    'disables the query for address %s',
    (safeAddress) => {
      useGetSafeTransactionHistoryQuery({ pathParams: { safeAddress } })
      expect(capturedQuery().enabled).toBe(false)
    }
  )

  it.each([null, {}, { results: null }, { results: {} }])(
    'rejects malformed history: %j',
    async (payload) => {
      vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: payload })
      useGetSafeTransactionHistoryQuery({ pathParams: { safeAddress: address } })
      await expect(
        capturedQuery().queryFn({ signal: new AbortController().signal })
      ).rejects.toThrow('Safe transaction history response unavailable')
    }
  )

  it('propagates provider failures instead of returning an empty history', async () => {
    const error = new Error('Safe history unavailable')
    vi.spyOn(externalApiClient, 'get').mockRejectedValueOnce(error)
    useGetSafeTransactionHistoryQuery({ pathParams: { safeAddress: address } })
    await expect(capturedQuery().queryFn({ signal: new AbortController().signal })).rejects.toBe(
      error
    )
  })
})

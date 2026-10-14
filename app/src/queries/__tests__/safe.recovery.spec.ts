import { AxiosError, AxiosHeaders, CanceledError, type AxiosResponse } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toValue } from 'vue'
import { QueryClient, QueryObserver, type FetchQueryOptions } from '@tanstack/vue-query'
import externalApiClient from '@/lib/external.axios'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import type { SafeInfo } from '@/types/safe'

vi.mock('@/constant/index', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/constant/index')>()),
  currentChainId: 137
}))

const { safeBalancesQueryOptions } =
  await vi.importActual<typeof import('../safeClient.queries')>('../safeClient.queries')
const { useGetSafeInfoQuery } =
  await vi.importActual<typeof import('../safe.queries')>('../safe.queries')

const address = '0x0557f280d9da274254e85ee70c2936694e494275'
const balances = { fiatTotal: '0', items: [] }
const info = { address, owners: [address], threshold: 1 }

function httpFailure(status: number, retryAfter?: string, detail?: string) {
  return new AxiosError('Safe provider unavailable', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: { detail },
    headers: new AxiosHeaders(retryAfter ? { 'Retry-After': retryAfter } : {})
  } as AxiosResponse)
}

function infoOptions() {
  useGetSafeInfoQuery({ pathParams: { safeAddress: address } })
  return toValue(useQueryFn.mock.calls.at(-1)![0]) as FetchQueryOptions<SafeInfo>
}

describe('Safe automatic read recovery', () => {
  let client: QueryClient

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-13T12:00:00Z'))
    client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
  })

  afterEach(() => {
    client.clear()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('keeps a new Safe balance read pending through a 404 and shares the successful recovery', async () => {
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockRejectedValueOnce(httpFailure(404))
      .mockResolvedValueOnce({ data: balances })
    const options = safeBalancesQueryOptions(address, 137, 'USD')
    const first = client.fetchQuery(options)
    const second = client.fetchQuery(options)
    await vi.advanceTimersByTimeAsync(4999)

    expect(get).toHaveBeenCalledTimes(1)
    expect(client.getQueryState(options.queryKey)).toMatchObject({ status: 'pending', error: null })
    await vi.advanceTimersByTimeAsync(1)
    await expect(first).resolves.toEqual(balances)
    await expect(second).resolves.toEqual(balances)
    expect(get).toHaveBeenCalledTimes(2)
    expect(client.getQueryState(options.queryKey)).toMatchObject({ status: 'success', error: null })
  })

  it('recovers Safe information after a temporary deployment 404 without remounting', async () => {
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockRejectedValueOnce(httpFailure(404))
      .mockResolvedValueOnce({ data: info })
    const options = infoOptions()
    const result = client.fetchQuery(options)
    await vi.advanceTimersByTimeAsync(5000)

    await expect(result).resolves.toEqual(info)
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('waits for the numeric Retry-After before retrying rate-limited Gateway balances', async () => {
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockRejectedValueOnce(httpFailure(429, '45'))
      .mockResolvedValueOnce({ data: balances })
    const result = client.fetchQuery(safeBalancesQueryOptions(address, 137, 'USD'))
    await vi.advanceTimersByTimeAsync(44_999)
    expect(get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(result).resolves.toEqual(balances)
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('waits for an HTTP-date Retry-After before retrying Safe information', async () => {
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockRejectedValueOnce(httpFailure(429, 'Tue, 13 Oct 2026 12:01:15 GMT'))
      .mockResolvedValueOnce({ data: info })
    const result = client.fetchQuery(infoOptions())
    await vi.advanceTimersByTimeAsync(74_999)
    expect(get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(result).resolves.toEqual(info)
  })

  it.each([undefined, 'invalid', '-1'])(
    'uses a thirty-second 429 interval with Retry-After %s',
    async (header) => {
      const get = vi
        .spyOn(externalApiClient, 'get')
        .mockRejectedValueOnce(httpFailure(429, header))
        .mockResolvedValueOnce({ data: balances })
      const result = client.fetchQuery(safeBalancesQueryOptions(address, 137, 'USD'))
      await vi.advanceTimersByTimeAsync(29_999)
      expect(get).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1)
      await expect(result).resolves.toEqual(balances)
    }
  )

  it('stops recovery after three retries and keeps a persistent failure visible', async () => {
    const error = httpFailure(404)
    const get = vi.spyOn(externalApiClient, 'get').mockRejectedValue(error)
    const options = safeBalancesQueryOptions(address, 137, 'USD')
    const failure = expect(client.fetchQuery(options)).rejects.toBe(error)
    await vi.advanceTimersByTimeAsync(15_000)
    await failure

    expect(get).toHaveBeenCalledTimes(4)
    expect(client.getQueryState(options.queryKey)).toMatchObject({ status: 'error', error })
  })

  it('retries successive server failures at the same five-second interval', async () => {
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockRejectedValueOnce(httpFailure(503))
      .mockRejectedValueOnce(httpFailure(503))
      .mockResolvedValueOnce({ data: balances })
    const result = client.fetchQuery(safeBalancesQueryOptions(address, 137, 'USD'))
    await vi.advanceTimersByTimeAsync(5000)
    expect(get).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(4999)
    expect(get).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    await expect(result).resolves.toEqual(balances)
  })

  it('keeps the initial loader active between fixed-interval attempts until balances arrive', async () => {
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockRejectedValueOnce(httpFailure(404))
      .mockRejectedValueOnce(httpFailure(404))
      .mockRejectedValueOnce(httpFailure(404))
      .mockResolvedValueOnce({ data: balances })
    const observer = new QueryObserver(client, safeBalancesQueryOptions(address, 137, 'USD'))
    const stop = observer.subscribe(() => {})
    try {
      await vi.advanceTimersByTimeAsync(0)
      for (let attempt = 1; attempt <= 3; attempt++) {
        await vi.advanceTimersByTimeAsync(4999)
        expect(get).toHaveBeenCalledTimes(attempt)
        expect(observer.getCurrentResult()).toMatchObject({ isLoading: true, error: null })
        await vi.advanceTimersByTimeAsync(1)
      }
      expect(get).toHaveBeenCalledTimes(4)
      expect(observer.getCurrentResult()).toMatchObject({
        isLoading: false,
        isSuccess: true,
        data: balances
      })
    } finally {
      stop()
    }
  })

  it('keeps a fixed thirty-second interval across consecutive rate-limit failures', async () => {
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockRejectedValueOnce(httpFailure(429))
      .mockRejectedValueOnce(httpFailure(429))
      .mockResolvedValueOnce({ data: balances })
    const result = client.fetchQuery(safeBalancesQueryOptions(address, 137, 'USD'))
    await vi.advanceTimersByTimeAsync(30_000)
    expect(get).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(29_999)
    expect(get).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    await expect(result).resolves.toEqual(balances)
  })

  it('recovers a network failure without requiring the user to reload', async () => {
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'))
      .mockResolvedValueOnce({ data: balances })
    const result = client.fetchQuery(safeBalancesQueryOptions(address, 137, 'USD'))
    await vi.advanceTimersByTimeAsync(5000)
    await expect(result).resolves.toEqual(balances)
    expect(get).toHaveBeenCalledTimes(2)
  })

  it.each([
    httpFailure(400),
    httpFailure(401),
    httpFailure(403),
    httpFailure(429, undefined, 'Monthly quota exceeded.'),
    new CanceledError('Safe read cancelled')
  ])('does not retry a permanent or cancelled read: %s', async (error) => {
    const get = vi.spyOn(externalApiClient, 'get').mockRejectedValue(error)
    await expect(client.fetchQuery(safeBalancesQueryOptions(address, 137, 'USD'))).rejects.toBe(
      error
    )
    await vi.advanceTimersByTimeAsync(120_000)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('rejects malformed Gateway responses without retrying or displaying an empty wallet', async () => {
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValue({ data: {} })
    await expect(client.fetchQuery(safeBalancesQueryOptions(address, 137, 'USD'))).rejects.toThrow(
      'Safe balances response unavailable'
    )
    expect(get).toHaveBeenCalledTimes(1)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import externalApiClient from '@/lib/external.axios'
import { queryClient } from '../queryClient'
import { getSafeServiceResponse } from '../safe.requests'

const url = 'https://api.safe.global/tx-service/pol/api/v1/safes/0xSafe/'
describe('Safe Transaction Service admission', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    queryClient.clear()
    vi.stubEnv('VITE_APP_SAFE_API_KEY', 'test-safe-key')
  })
  afterEach(() => {
    queryClient.clear()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('spaces the three cold Safe reads and authenticates the direct service', async () => {
    const starts: number[] = []
    const get = vi.spyOn(externalApiClient, 'get').mockImplementation(async () => {
      starts.push(Date.now())
      return { data: { results: [] } }
    })
    const pending = Promise.all([
      getSafeServiceResponse(url),
      getSafeServiceResponse(url),
      getSafeServiceResponse(url)
    ])
    await vi.advanceTimersByTimeAsync(0)
    expect(get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(999)
    expect(get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1001)
    await pending
    expect(starts.map((at) => at - starts[0]!)).toEqual([0, 1000, 2000])
    expect(get).toHaveBeenCalledWith(url, {
      signal: undefined,
      headers: { Authorization: 'Bearer test-safe-key' }
    })
  })

  it('does not forward the Safe key to another provider or the Gateway', async () => {
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValue({ data: {} })
    await getSafeServiceResponse('https://safe-client.safe.global/v1/chains/137/')
    expect(get).toHaveBeenCalledWith(expect.any(String), { signal: undefined })
  })

  it('removes credentials from propagated request diagnostics', async () => {
    const failure = {
      config: { headers: { Authorization: 'Bearer private-test-credential' } },
      response: { status: 503 }
    }
    vi.spyOn(externalApiClient, 'get').mockRejectedValue(failure)
    await expect(getSafeServiceResponse(url)).rejects.toBe(failure)
    expect(JSON.stringify(failure)).not.toContain('private-test-credential')
  })

  it('blocks queued and explicit reads during Retry-After, then resumes', async () => {
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockRejectedValueOnce({ response: { status: 429, headers: { 'retry-after': '120' } } })
      .mockResolvedValue({ data: {} })
    const results = await Promise.allSettled([
      getSafeServiceResponse(url),
      getSafeServiceResponse(url),
      getSafeServiceResponse(url)
    ])
    expect(results.every((result) => result.status === 'rejected')).toBe(true)
    expect(get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(119_999)
    await expect(getSafeServiceResponse(url)).rejects.toMatchObject({ status: 429 })
    expect(get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(getSafeServiceResponse(url)).resolves.toEqual({})
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('skips an aborted queued read without consuming another admission slot', async () => {
    let complete!: () => void
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            complete = () => resolve({ data: {} })
          })
      )
      .mockResolvedValue({ data: {} })
    const first = getSafeServiceResponse(url)
    await vi.advanceTimersByTimeAsync(0)
    const controller = new AbortController()
    const cancelled = expect(getSafeServiceResponse(url, controller.signal)).rejects.toMatchObject({
      name: 'AbortError'
    })
    controller.abort()
    complete()
    await first
    await cancelled
    const next = getSafeServiceResponse(url)
    await vi.advanceTimersByTimeAsync(1000)
    await next
    expect(get).toHaveBeenCalledTimes(2)
  })
})

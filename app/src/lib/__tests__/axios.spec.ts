import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { AxiosAdapter, AxiosError } from 'axios'

// Opt out of the global mock — we need the real apiClient with its interceptors.
vi.unmock('@/lib/axios')

describe('apiClient retry interceptor', () => {
  let apiClient: typeof import('@/lib/axios').default

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
    apiClient = (await vi.importActual<typeof import('@/lib/axios')>('@/lib/axios')).default
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const fakeError = (status: number | undefined): Partial<AxiosError> => ({
    isAxiosError: true,
    code: status === undefined ? 'ECONNRESET' : undefined,
    response: status === undefined ? undefined : ({ status } as AxiosError['response']),
    message: 'fake'
  })

  const adapterThatFailsThenSucceeds = (
    failuresFirst: number,
    failureStatus: number | undefined
  ): AxiosAdapter => {
    let calls = 0
    return vi.fn(async (config) => {
      calls++
      if (calls <= failuresFirst) {
        const err = Object.assign(new Error('fake'), fakeError(failureStatus), { config })
        throw err
      }
      return { data: { ok: calls }, status: 200, statusText: 'OK', headers: {}, config }
    })
  }

  it('retries on 503 and eventually succeeds within 3 retries', async () => {
    apiClient.defaults.adapter = adapterThatFailsThenSucceeds(2, 503)
    const promise = apiClient.get('test')
    await vi.runAllTimersAsync()
    const res = await promise
    expect(res.data).toEqual({ ok: 3 })
  })

  it('retries on a network error (no response)', async () => {
    apiClient.defaults.adapter = adapterThatFailsThenSucceeds(1, undefined)
    const promise = apiClient.get('test')
    await vi.runAllTimersAsync()
    const res = await promise
    expect(res.data).toEqual({ ok: 2 })
  })

  it('does NOT retry on 401 (non-retriable status)', async () => {
    const adapter = vi.fn(async (config) => {
      throw Object.assign(new Error('unauthorized'), fakeError(401), { config })
    })
    apiClient.defaults.adapter = adapter as unknown as AxiosAdapter
    const promise = apiClient.get('test').catch((e) => e)
    await vi.runAllTimersAsync()
    await promise
    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('gives up after 3 retries (4 total attempts) on persistent 502', async () => {
    const adapter = vi.fn(async (config) => {
      throw Object.assign(new Error('bad gw'), fakeError(502), { config })
    })
    apiClient.defaults.adapter = adapter as unknown as AxiosAdapter
    const promise = apiClient.get('test').catch((e) => e)
    await vi.runAllTimersAsync()
    const err = (await promise) as AxiosError
    expect(err.response?.status).toBe(502)
    expect(adapter).toHaveBeenCalledTimes(4)
  })
})

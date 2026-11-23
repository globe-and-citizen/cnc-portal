import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { AxiosAdapter, AxiosError } from 'axios'
import { mockUserStore } from '@/tests/mocks'

const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  setTag: vi.fn(),
  withScope: vi.fn()
}))

vi.mock('@sentry/vue', () => sentryMocks)

// Opt out of the global mock — we need the real apiClient with its interceptors.
vi.unmock('@/lib/axios')

describe('apiClient retry interceptor', () => {
  let apiClient: typeof import('@/lib/axios').default
  let setupAuthInterceptor: typeof import('@/lib/axios').setupAuthInterceptor

  beforeEach(async () => {
    vi.useFakeTimers()
    sentryMocks.captureException.mockClear()
    sentryMocks.setTag.mockClear()
    sentryMocks.withScope.mockImplementation((callback) => callback({ setTag: sentryMocks.setTag }))
    vi.resetModules()
    const clientModule = await vi.importActual<typeof import('@/lib/axios')>('@/lib/axios')
    apiClient = clientModule.default
    setupAuthInterceptor = clientModule.setupAuthInterceptor
  })

  afterEach(() => {
    localStorage.removeItem('authToken')
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
    expect(sentryMocks.captureException).not.toHaveBeenCalled()
  })

  it('retries on a network error (no response)', async () => {
    apiClient.defaults.adapter = adapterThatFailsThenSucceeds(1, undefined)
    const promise = apiClient.get('test')
    await vi.runAllTimersAsync()
    const res = await promise
    expect(res.data).toEqual({ ok: 2 })
    expect(sentryMocks.captureException).not.toHaveBeenCalled()
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
    expect(sentryMocks.captureException).not.toHaveBeenCalled()
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
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1)
    expect(sentryMocks.setTag).toHaveBeenCalledWith('runtime', 'frontend')
    expect(sentryMocks.setTag).toHaveBeenCalledWith('error.source', 'axios.api')
    expect(sentryMocks.setTag).toHaveBeenCalledWith('http.status_code', '502')
  })

  it('captures a non-retriable network failure', async () => {
    const adapter = vi.fn(async (config) => {
      throw Object.assign(new Error('network down'), fakeError(undefined), { config })
    })
    apiClient.defaults.adapter = adapter as unknown as AxiosAdapter
    const promise = apiClient.get('test').catch((e) => e)
    await vi.runAllTimersAsync()
    await promise

    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1)
  })

  it.each([
    { url: 'auth/token', status: 401, changed: false, clearsSession: true },
    { url: 'teams', status: 401, changed: true, clearsSession: false },
    { url: 'teams', status: 403, changed: false, clearsSession: false },
    { url: 'auth/siwe', status: 401, changed: false, clearsSession: false }
  ])(
    'handles $status for $url with token replacement: $changed',
    async ({ url, status, changed, clearsSession }) => {
      localStorage.setItem('authToken', 'current-token')
      setupAuthInterceptor()
      apiClient.defaults.adapter = async (config) => {
        expect(config.headers.get('Authorization')).toBe('Bearer current-token')
        if (changed) localStorage.setItem('authToken', 'new-token')
        throw Object.assign(new Error('Rejected'), fakeError(status), { config })
      }

      await expect(apiClient.get(url)).rejects.toMatchObject({ response: { status } })
      expect(mockUserStore.clearUserData).toHaveBeenCalledTimes(clearsSession ? 1 : 0)
    }
  )
})

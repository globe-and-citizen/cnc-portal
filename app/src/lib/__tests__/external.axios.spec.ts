import { AxiosError, CanceledError, type AxiosAdapter } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import externalApiClient from '../external.axios'

describe('external Axios Safe authentication', () => {
  beforeEach(() => vi.stubEnv('VITE_APP_SAFE_API_KEY', ' test-safe-key '))
  afterEach(() => vi.unstubAllEnvs())

  it.each([
    ['https://api.safe.global/tx-service/pol/api/v1/safes/0xSafe/', 'Bearer test-safe-key'],
    ['https://safe-client.safe.global/v1/chains/137/', undefined],
    ['https://api.coingecko.com/api/v3/coins/polygon-ecosystem-token', undefined],
    ['https://api.safe.global/other-api/', undefined],
    ['https://api.safe.global.example/tx-service/pol/', undefined]
  ])('scopes the configured credential for %s', async (url, authorization) => {
    const adapter: AxiosAdapter = async (config) => {
      expect(config.headers.get('Authorization')).toBe(authorization)
      return { data: { address: '0xSafe' }, status: 200, statusText: 'OK', headers: {}, config }
    }
    const { data } = await externalApiClient.get(url, { adapter })
    expect(data).toEqual({ address: '0xSafe' })
  })

  it('allows public reads without a configured credential', async () => {
    vi.stubEnv('VITE_APP_SAFE_API_KEY', '')
    const adapter: AxiosAdapter = async (config) => {
      expect(config.headers.has('Authorization')).toBe(false)
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }
    await externalApiClient.get('https://api.safe.global/tx-service/pol/', { adapter })
  })

  it('redacts credentials while preserving the HTTP failure', async () => {
    let failure!: AxiosError
    const adapter: AxiosAdapter = async (config) => {
      failure = new AxiosError('Too many requests', 'ERR_BAD_REQUEST', config, undefined, {
        data: {},
        status: 429,
        statusText: 'Too many requests',
        headers: {},
        config
      })
      throw failure
    }
    await expect(
      externalApiClient.get('https://api.safe.global/tx-service/pol/', { adapter })
    ).rejects.toMatchObject({ response: { status: 429 } })
    expect(JSON.stringify(failure)).not.toContain('test-safe-key')
  })

  it('cancels an aborted request before sending it', async () => {
    const controller = new AbortController()
    controller.abort()
    const adapter = vi.fn()
    await expect(
      externalApiClient.get('https://api.safe.global/tx-service/pol/', {
        signal: controller.signal,
        adapter
      })
    ).rejects.toBeInstanceOf(CanceledError)
    expect(adapter).not.toHaveBeenCalled()
  })
})

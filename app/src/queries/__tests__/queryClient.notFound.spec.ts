import {
  AxiosError,
  AxiosHeaders,
  CanceledError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig
} from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toValue } from 'vue'
import apiClient from '@/lib/axios'
import externalApiClient from '@/lib/external.axios'
import { getUser, getUserNonce } from '@/api/user.api'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { getSafeInfo } from '../safe.api'
import { safeBalancesQueryOptions } from '../safeClient.queries'

const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  setTag: vi.fn(),
  setLevel: vi.fn(),
  withScope: vi.fn()
}))

vi.mock('@sentry/vue', () => sentryMocks)
vi.mock('@/constant/index', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/constant/index')>()),
  currentChainId: 137
}))
// Exercise request annotations and interceptors instead of the global HTTP mock.
vi.unmock('@/lib/axios')

import { queryClient } from '../queryClient'

const { useGetTeamQuery, useGetTeamsQuery } =
  await vi.importActual<typeof import('../team.queries')>('../team.queries')
const { useGetUserQuery } =
  await vi.importActual<typeof import('../user.queries')>('../user.queries')
const address = '0x1111111111111111111111111111111111111111'
const originalApiAdapter = apiClient.defaults.adapter
const originalExternalAdapter = externalApiClient.defaults.adapter

const missingAdapter: AxiosAdapter = async (config) => {
  throw new AxiosError('Not Found', 'ERR_BAD_REQUEST', config, undefined, {
    status: 404,
    statusText: 'Not Found',
    data: {},
    headers: {},
    config
  })
}

function missingResource(expectation?: 'expected' | 'initially-expected') {
  const config = {
    method: 'get',
    headers: new AxiosHeaders({ Authorization: 'Bearer private-test-credential' }),
    sentryNotFound: expectation
  } as InternalAxiosRequestConfig
  return new AxiosError(
    'Request failed with status code 404',
    'ERR_BAD_REQUEST',
    config,
    undefined,
    {
      status: 404,
      statusText: 'Not Found',
      data: {},
      headers: {},
      config
    }
  )
}

describe('handled HTTP 404 monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
    sentryMocks.withScope.mockImplementation((callback) => callback(sentryMocks))
  })

  afterEach(() => {
    queryClient.clear()
    apiClient.defaults.adapter = originalApiAdapter
    externalApiClient.defaults.adapter = originalExternalAdapter
    vi.useRealTimers()
  })

  it.each(['profile', 'company', 'company-list'])(
    'classifies the real %s request at its owning read boundary',
    async (consumer) => {
      apiClient.defaults.adapter = missingAdapter
      if (consumer === 'profile') useGetUserQuery({ pathParams: { address } })
      else if (consumer === 'company') useGetTeamQuery({ pathParams: { teamId: 'missing' } })
      else useGetTeamsQuery({})
      const options = toValue(useQueryFn.mock.calls.at(-1)![0])

      await expect(
        queryClient.fetchQuery({
          queryKey: toValue(options.queryKey),
          queryFn: options.queryFn,
          retry: false
        })
      ).rejects.toMatchObject({ response: { status: 404 } })

      expect(sentryMocks.captureException).toHaveBeenCalledTimes(
        consumer === 'company-list' ? 1 : 0
      )
    }
  )

  it.each(['profile', 'nonce'])(
    'classifies the real sign-in %s request without hiding unrelated 404 failures',
    async (resource) => {
      apiClient.defaults.adapter = missingAdapter
      const mutation = queryClient.getMutationCache().build(queryClient, {
        mutationFn: () => (resource === 'profile' ? getUser(address) : getUserNonce(address))
      })
      await expect(mutation.execute()).rejects.toMatchObject({ response: { status: 404 } })
      expect(sentryMocks.captureException).toHaveBeenCalledTimes(resource === 'profile' ? 0 : 1)
    }
  )

  it.each(['information', 'balance'])(
    'preserves initial indexing absence through the real Safe %s request',
    async (resource) => {
      externalApiClient.defaults.adapter = missingAdapter
      const options =
        resource === 'balance'
          ? safeBalancesQueryOptions(address, 137, 'USD')
          : {
              queryKey: ['safe', 'info'],
              queryFn: ({ signal }: { signal: AbortSignal }) => getSafeInfo(address, signal)
            }
      await expect(queryClient.fetchQuery({ ...options, retry: false })).rejects.toMatchObject({
        response: { status: 404 }
      })
      expect(sentryMocks.captureException).not.toHaveBeenCalled()
      expect(sentryMocks.addBreadcrumb).toHaveBeenCalledTimes(1)
    }
  )

  it('captures a required read only after retries finish and preserves its error', async () => {
    const error = missingResource()
    const queryFn = vi.fn(async () => {
      expect(sentryMocks.captureException).not.toHaveBeenCalled()
      throw error
    })

    await expect(
      queryClient.fetchQuery({ queryKey: ['teams', 'list'], queryFn, retry: 2, retryDelay: 0 })
    ).rejects.toBe(error)

    expect(queryFn).toHaveBeenCalledTimes(3)
    expect(sentryMocks.captureException).toHaveBeenCalledExactlyOnceWith(error)
    expect(sentryMocks.setLevel).toHaveBeenCalledWith('error')
    expect(sentryMocks.setTag).toHaveBeenCalledWith('http.status_code', '404')
    expect(sentryMocks.setTag).toHaveBeenCalledWith('error.operation', 'query')
    expect(sentryMocks.setTag).toHaveBeenCalledWith('query.name', 'teams')
    expect(JSON.stringify(error)).not.toContain('private-test-credential')
  })

  it('reports one event during repeated failed refreshes and observes a new outage after recovery', async () => {
    let available = false
    const options = {
      queryKey: ['teams', 'list'],
      queryFn: async () => {
        if (!available) throw missingResource()
        return []
      },
      retry: false
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      await expect(queryClient.fetchQuery(options)).rejects.toMatchObject({
        response: { status: 404 }
      })
    }
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1)

    available = true
    await queryClient.fetchQuery(options)
    available = false
    await expect(queryClient.fetchQuery(options)).rejects.toMatchObject({
      response: { status: 404 }
    })

    expect(sentryMocks.captureException).toHaveBeenCalledTimes(2)
  })

  it('keeps an explicitly expected missing resource diagnostic even after cached success', async () => {
    const queryKey = ['teams', 'detail', { teamId: 'missing' }]
    queryClient.setQueryData(queryKey, { id: 'missing' })
    const queryFn = async () => {
      throw missingResource('expected')
    }
    await expect(
      queryClient.fetchQuery({ queryKey, queryFn, retry: false })
    ).rejects.toBeInstanceOf(AxiosError)
    await expect(
      queryClient.fetchQuery({ queryKey, queryFn, retry: false })
    ).rejects.toBeInstanceOf(AxiosError)

    expect(sentryMocks.captureException).not.toHaveBeenCalled()
    expect(sentryMocks.addBreadcrumb).toHaveBeenCalledTimes(1)
    expect(sentryMocks.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'http.not_found', level: 'info' })
    )
  })

  it('warns once when initial Safe absence is observed again after five minutes', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-01T12:00:00Z'))
    const options = {
      queryKey: ['balance', 'safe'],
      queryFn: async () => {
        throw missingResource('initially-expected')
      },
      retry: false
    }
    await expect(queryClient.fetchQuery(options)).rejects.toBeInstanceOf(AxiosError)
    expect(sentryMocks.captureException).not.toHaveBeenCalled()

    vi.setSystemTime(new Date('2026-11-01T12:04:59Z'))
    await expect(queryClient.fetchQuery(options)).rejects.toBeInstanceOf(AxiosError)
    expect(sentryMocks.captureException).not.toHaveBeenCalled()

    vi.setSystemTime(new Date('2026-11-01T12:05:00Z'))
    await expect(queryClient.fetchQuery(options)).rejects.toBeInstanceOf(AxiosError)
    await expect(queryClient.fetchQuery(options)).rejects.toBeInstanceOf(AxiosError)
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1)
    expect(sentryMocks.setLevel).toHaveBeenCalledWith('warning')
  })

  it('captures a Safe regression immediately when the same query already has successful data', async () => {
    const queryKey = ['balance', 'safe']
    queryClient.setQueryData(queryKey, { fiatTotal: '100' })
    const error = missingResource('initially-expected')
    await expect(
      queryClient.fetchQuery({
        queryKey,
        queryFn: async () => {
          throw error
        },
        retry: false
      })
    ).rejects.toBe(error)
    expect(sentryMocks.captureException).toHaveBeenCalledExactlyOnceWith(error)
    expect(sentryMocks.setLevel).toHaveBeenCalledWith('error')
    expect(queryClient.getQueryData(queryKey)).toEqual({ fiatTotal: '100' })
  })

  it.each([undefined, 'expected'] as const)(
    'respects request expectation %s inside a mutation',
    async (expectation) => {
      const error = missingResource(expectation)
      const mutation = queryClient.getMutationCache().build(queryClient, {
        mutationFn: async () => {
          throw error
        }
      })
      await expect(mutation.execute()).rejects.toBe(error)
      expect(sentryMocks.captureException).toHaveBeenCalledTimes(expectation ? 0 : 1)
      if (!expectation)
        expect(sentryMocks.setTag).toHaveBeenCalledWith('error.operation', 'mutation')
    }
  )

  it('does not turn cancellation or an unrelated failure into a missing-resource event', async () => {
    for (const error of [new CanceledError(), new Error('Other failure')]) {
      await expect(
        queryClient.fetchQuery({
          queryKey: ['cancelled'],
          queryFn: async () => {
            throw error
          },
          retry: false
        })
      ).rejects.toBe(error)
    }
    expect(sentryMocks.captureException).not.toHaveBeenCalled()
    expect(sentryMocks.addBreadcrumb).not.toHaveBeenCalled()
  })
})

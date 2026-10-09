import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueryFn } from '@/tests/mocks/composables.mock'

const safeQueries = await vi.importActual<typeof import('../safe.queries')>('../safe.queries')
const LOWERCASE_SAFE_ADDRESS = '0x0557f280d9da274254e85ee70c2936694e494275'

describe('Safe query refresh and recovery', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['info', safeQueries.useGetSafeInfoQuery],
    ['all transfers', safeQueries.useGetSafeTransfersQuery],
    ['incoming transfers', safeQueries.useGetSafeIncomingTransfersQuery],
    ['outgoing transactions', safeQueries.useGetSafeOutgoingTransactionsQuery]
  ])(
    'uses preset minute freshness, refreshes %s every five minutes and retries one transient failure',
    (_name, useQuery) => {
      useQuery({ pathParams: { safeAddress: LOWERCASE_SAFE_ADDRESS } })
      const options = useQueryFn.mock.calls.at(-1)![0]
      expect(options.staleTime).toBe(60_000)
      expect(options.refetchInterval).toBe(300_000)
      expect(options.refetchIntervalInBackground).toBe(false)
      expect(options.refetchOnWindowFocus).toBe(false)
      expect(options.retry(0, { response: { status: 429 } })).toBe(false)
      expect(options.retry(0, { response: { status: 404 } })).toBe(false)
      expect(options.retry(0, { response: { status: 503 } })).toBe(true)
      expect(options.retry(1, { response: { status: 503 } })).toBe(false)
      expect(options.retry(0, new Error('Network unavailable'))).toBe(true)
      expect(options.retryDelay).toBe(5000)
    }
  )

  it('polls the transaction queue faster only while a transaction is pending', () => {
    safeQueries.useGetSafeTransactionsQuery({ pathParams: { safeAddress: LOWERCASE_SAFE_ADDRESS } })
    const options = useQueryFn.mock.calls.at(-1)![0]
    expect(options.refetchInterval({ state: { data: undefined } })).toBe(300_000)
    expect(options.refetchInterval({ state: { data: [] } })).toBe(300_000)
    expect(options.refetchInterval({ state: { data: [{ isExecuted: true }] } })).toBe(300_000)
    expect(options.refetchInterval({ state: { data: [{ isExecuted: false }] } })).toBe(60_000)
  })

  it('loads a transaction detail without periodic provider requests', () => {
    safeQueries.useGetSafeTransactionQuery({ pathParams: { safeTxHash: '0xhash' } })
    expect(useQueryFn.mock.calls.at(-1)![0].refetchInterval).toBe(false)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import { contractBalanceKeys } from '@/composables/useContractBalance'
import externalApiClient from '@/lib/external.axios'
import type { SafeIncomingTransfer, SafeTransaction } from '@/types/safe'
import { useQueryFn } from '@/tests/mocks/composables.mock'

const LOWERCASE_SAFE_ADDRESS = '0x0557f280d9da274254e85ee70c2936694e494275'
const CHECKSUM_SAFE_ADDRESS = '0x0557F280D9DA274254e85Ee70c2936694e494275'
const SECOND_LOWERCASE_SAFE_ADDRESS = '0x52908400098527886e0f7030069857d2e4169ee7'

vi.mock('@/constant/index', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/constant/index')>()),
  currentChainId: 137
}))

const safeQueries = await vi.importActual<typeof import('../safe.queries')>('../safe.queries')
const { safeKeys } = safeQueries

interface CapturedQuery<T> {
  queryKey: MaybeRefOrGetter<readonly unknown[]>
  enabled: MaybeRefOrGetter<boolean>
  queryFn: (context: { signal: AbortSignal }) => Promise<T[]>
}

const capturedQuery = <T>(): CapturedQuery<T> =>
  useQueryFn.mock.calls.at(-1)?.[0] as CapturedQuery<T>

const incoming = (transactionHash: string) => ({ transactionHash }) as SafeIncomingTransfer

const outgoing = (safeTxHash: string) => ({ safeTxHash }) as SafeTransaction

describe('safe queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds incoming transfer keys with a checksum-normalized address and optional limit', () => {
    expect(safeKeys.incomingTransfers(LOWERCASE_SAFE_ADDRESS, 10)).toEqual([
      'safe',
      'incoming-transfers',
      { safeAddress: CHECKSUM_SAFE_ADDRESS, limit: 10 }
    ])

    expect(safeKeys.incomingTransfers(LOWERCASE_SAFE_ADDRESS)).toEqual([
      'safe',
      'incoming-transfers',
      { safeAddress: CHECKSUM_SAFE_ADDRESS, limit: undefined }
    ])
  })

  it('builds the balance key the contract-balance query owns', () => {
    expect(safeKeys.balance(LOWERCASE_SAFE_ADDRESS, 137)).toEqual(
      contractBalanceKeys.detail(CHECKSUM_SAFE_ADDRESS, 137)
    )
    expect(safeKeys.balance(LOWERCASE_SAFE_ADDRESS, 137)).toEqual([
      'balance',
      { address: CHECKSUM_SAFE_ADDRESS, chainId: 137 }
    ])
  })

  it('reacts when the Accounting Safe address becomes available or changes', () => {
    const address = ref<string>()

    safeQueries.useGetSafeIncomingTransfersQuery({
      pathParams: { safeAddress: address },
      queryParams: { limit: 500 }
    })
    const incomingQuery = capturedQuery<SafeIncomingTransfer>()

    safeQueries.useGetSafeOutgoingTransactionsQuery({
      pathParams: { safeAddress: address },
      queryParams: { limit: 500 }
    })
    const outgoingQuery = capturedQuery<SafeTransaction>()

    expect(toValue(incomingQuery.enabled)).toBe(false)
    expect(toValue(outgoingQuery.enabled)).toBe(false)

    address.value = LOWERCASE_SAFE_ADDRESS

    expect(toValue(incomingQuery.enabled)).toBe(true)
    expect(toValue(incomingQuery.queryKey)).toEqual(
      safeKeys.incomingTransfers(CHECKSUM_SAFE_ADDRESS, 500)
    )
    expect(toValue(outgoingQuery.enabled)).toBe(true)
    expect(toValue(outgoingQuery.queryKey)).toEqual(
      safeKeys.outgoingTransactions(CHECKSUM_SAFE_ADDRESS, 500)
    )

    address.value = SECOND_LOWERCASE_SAFE_ADDRESS

    expect(toValue(incomingQuery.queryKey)).toEqual(
      safeKeys.incomingTransfers(SECOND_LOWERCASE_SAFE_ADDRESS, 500)
    )
    expect(toValue(outgoingQuery.queryKey)).toEqual(
      safeKeys.outgoingTransactions(SECOND_LOWERCASE_SAFE_ADDRESS, 500)
    )
  })

  it('loads every incoming transfer page in service order', async () => {
    const get = vi.spyOn(externalApiClient, 'get')
    get
      .mockResolvedValueOnce({
        data: {
          next: '/api/v1/safes/0xSafe/incoming-transfers/?limit=2&offset=2',
          results: [incoming('0xIncoming1'), incoming('0xIncoming2')]
        }
      })
      .mockResolvedValueOnce({
        data: { next: null, results: [incoming('0xIncoming3')] }
      })

    safeQueries.useGetSafeIncomingTransfersQuery({
      pathParams: { safeAddress: LOWERCASE_SAFE_ADDRESS },
      queryParams: { limit: 2 }
    })
    const query = capturedQuery<SafeIncomingTransfer>()
    const signal = new AbortController().signal

    await expect(query.queryFn({ signal })).resolves.toEqual([
      incoming('0xIncoming1'),
      incoming('0xIncoming2'),
      incoming('0xIncoming3')
    ])
    expect(get).toHaveBeenCalledTimes(2)
    expect(get.mock.calls[0]?.[0]).toContain(`/safes/${CHECKSUM_SAFE_ADDRESS}/`)
    expect(get.mock.calls[0]?.[0]).toContain('/incoming-transfers/?limit=2')
    expect(get.mock.calls[1]?.[0]).toContain('/incoming-transfers/?limit=2&offset=2')
    expect(get).toHaveBeenNthCalledWith(1, expect.any(String), { signal })
    expect(get).toHaveBeenNthCalledWith(2, expect.any(String), { signal })
  })

  it('loads every executed outgoing transaction page in service order', async () => {
    const get = vi.spyOn(externalApiClient, 'get')
    get
      .mockResolvedValueOnce({
        data: {
          next: '/api/v1/safes/0xSafe/multisig-transactions/?executed=true&limit=2&offset=2',
          results: [outgoing('0xOutgoing1'), outgoing('0xOutgoing2')]
        }
      })
      .mockResolvedValueOnce({ data: { next: null, results: [outgoing('0xOutgoing3')] } })

    safeQueries.useGetSafeOutgoingTransactionsQuery({
      pathParams: { safeAddress: LOWERCASE_SAFE_ADDRESS },
      queryParams: { limit: 2 }
    })
    const query = capturedQuery<SafeTransaction>()

    await expect(query.queryFn({ signal: new AbortController().signal })).resolves.toEqual([
      outgoing('0xOutgoing1'),
      outgoing('0xOutgoing2'),
      outgoing('0xOutgoing3')
    ])
    expect(get).toHaveBeenCalledTimes(2)
    expect(get.mock.calls[0]?.[0]).toContain(`/safes/${CHECKSUM_SAFE_ADDRESS}/`)
    expect(get.mock.calls[0]?.[0]).toContain('/multisig-transactions/?executed=true&limit=2')
    expect(get.mock.calls[1]?.[0]).toContain(
      '/multisig-transactions/?executed=true&limit=2&offset=2'
    )
  })

  it('rejects the whole query when a later page cannot be loaded', async () => {
    const get = vi.spyOn(externalApiClient, 'get')
    const pageError = new Error('Safe page unavailable')
    get
      .mockResolvedValueOnce({
        data: {
          next: '/api/v1/safes/0xSafe/incoming-transfers/?limit=1&offset=1',
          results: [incoming('0xIncoming1')]
        }
      })
      .mockRejectedValueOnce(pageError)

    safeQueries.useGetSafeIncomingTransfersQuery({
      pathParams: { safeAddress: LOWERCASE_SAFE_ADDRESS },
      queryParams: { limit: 1 }
    })

    await expect(
      capturedQuery<SafeIncomingTransfer>().queryFn({ signal: new AbortController().signal })
    ).rejects.toBe(pageError)
  })

  it('rejects repeated pagination links instead of looping forever', async () => {
    const get = vi.spyOn(externalApiClient, 'get')
    const repeatedPage = '/api/v1/safes/0xSafe/incoming-transfers/?limit=1&offset=1'
    get
      .mockResolvedValueOnce({ data: { next: repeatedPage, results: [incoming('0xIncoming1')] } })
      .mockResolvedValueOnce({ data: { next: repeatedPage, results: [incoming('0xIncoming2')] } })

    safeQueries.useGetSafeIncomingTransfersQuery({
      pathParams: { safeAddress: LOWERCASE_SAFE_ADDRESS },
      queryParams: { limit: 1 }
    })

    await expect(
      capturedQuery<SafeIncomingTransfer>().queryFn({ signal: new AbortController().signal })
    ).rejects.toThrow('Safe pagination returned a repeated page')
    expect(get).toHaveBeenCalledTimes(2)
  })
})

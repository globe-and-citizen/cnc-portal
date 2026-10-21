import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue } from 'vue'
import externalApiClient from '@/lib/external.axios'
import { useQueriesFn } from '@/tests/mocks'
import { mockWagmiCore } from '@/tests/mocks/wagmi.vue.mock'
import { swapFeeFixture, HASH, UID } from '@/utils/accounting/__tests__/swapFeeFixtures'
import {
  fetchCowOrders,
  fetchCowTrades,
  useGetCowOrdersQuery,
  useGetCowTradesQuery,
  useGetSwapExecutionsQuery
} from '../swapFees.queries'

afterEach(() => vi.restoreAllMocks())
describe('CoW executed fee queries', () => {
  it('requests validated transaction orders with cancellation and no internal credentials', async () => {
    const { order } = swapFeeFixture()
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValue({ data: [order] })
    const signal = new AbortController().signal
    expect(await fetchCowOrders(137, HASH, signal)).toEqual([order])
    expect(get).toHaveBeenCalledExactlyOnceWith(
      `https://api.cow.fi/polygon/api/v1/transactions/${HASH}/orders`,
      { signal }
    )
    await expect(fetchCowOrders(1, HASH)).rejects.toThrow('unavailable')
    await expect(fetchCowOrders(137, 'invalid')).rejects.toThrow('unavailable')
    get.mockResolvedValue({ data: [{ ...order, executedFee: -1 }] })
    await expect(fetchCowOrders(137, HASH)).rejects.toThrow()
  })
  it('reads all paginated fills before using an order total', async () => {
    const { trade } = swapFeeFixture()
    const page = Array.from({ length: 100 }, (_, logIndex) => ({ ...trade, logIndex }))
    const last = { ...trade, logIndex: 100 }
    const get = vi
      .spyOn(externalApiClient, 'get')
      .mockResolvedValueOnce({ data: page })
      .mockResolvedValueOnce({ data: [last] })
    const signal = new AbortController().signal
    expect(await fetchCowTrades(137, UID, signal)).toHaveLength(101)
    expect(get).toHaveBeenLastCalledWith('https://api.cow.fi/polygon/api/v2/trades', {
      signal,
      params: { orderUid: UID, offset: 100, limit: 100 }
    })
  })
  it('rejects repeated pages, foreign order evidence and failed reads', async () => {
    const { trade } = swapFeeFixture()
    const get = vi.spyOn(externalApiClient, 'get').mockResolvedValue({ data: [trade, trade] })
    await expect(fetchCowTrades(137, UID)).rejects.toThrow('Duplicate')
    get.mockResolvedValue({ data: [{ ...trade, orderUid: `0x${'c'.repeat(112)}` }] })
    await expect(fetchCowTrades(137, UID)).rejects.toThrow('Mismatched')
    get.mockRejectedValue(new Error('Unavailable'))
    await expect(fetchCowTrades(137, UID)).rejects.toThrow('Unavailable')
  })
  it('separates network/hash/order cache keys and disables unopened or unsupported targets', () => {
    const chainId = ref(137)
    const hashes = ref<string[]>([])
    useGetCowOrdersQuery({ chainId, hashes })
    const query = useQueriesFn.mock.calls.at(-1)![0].queries
    expect(toValue(query)).toHaveLength(0)
    hashes.value = [HASH]
    expect(toValue(query)[0]).toMatchObject({
      enabled: true,
      refetchInterval: false,
      queryKey: ['cow-orders', 137, HASH]
    })
    chainId.value = 1
    expect(toValue(query)[0]!.enabled).toBe(false)
    useGetCowTradesQuery({ chainId: 137, orderUids: [UID, UID] })
    const queries = toValue(useQueriesFn.mock.calls.at(-1)![0].queries)
    expect(queries).toHaveLength(1)
    expect(queries[0]).toMatchObject({ queryKey: ['cow-trades', 137, UID], refetchInterval: false })
  })
})

describe('Swap settlement receipts', () => {
  const receipt = vi.fn()
  const query = () => {
    mockWagmiCore.getPublicClient.mockReturnValue({ getTransactionReceipt: receipt })
    useGetSwapExecutionsQuery([HASH, HASH.toUpperCase().replace('0X', '0x')])
    const queries = toValue(useQueriesFn.mock.calls.at(-1)![0].queries)
    expect(queries).toHaveLength(1)
    return queries[0]!
  }
  it('reads each mined receipt once, without polling, and keeps gas apart from swap fees', async () => {
    receipt.mockReset().mockResolvedValue({
      status: 'success',
      blockNumber: 100n,
      gasUsed: 1914824n,
      effectiveGasPrice: 342529698358n,
      from: '0x1111111111111111111111111111111111111111',
      logs: []
    })
    const swap = query()
    expect(swap).toMatchObject({
      queryKey: ['swap-execution', expect.any(Number), HASH],
      staleTime: Infinity,
      refetchInterval: false
    })
    expect(await swap.queryFn()).toMatchObject({
      transactionHash: HASH,
      blockNumber: '100',
      cowTrades: [],
      networkFee: {
        rawAmount: '655884087128658992',
        decimals: 18,
        payer: '0x1111111111111111111111111111111111111111'
      }
    })
  })
  it('rejects failed execution and keeps missing receipts unavailable', async () => {
    receipt.mockReset().mockResolvedValue({ status: 'reverted' })
    await expect(query().queryFn()).rejects.toThrow('did not succeed')
    receipt.mockRejectedValue(new Error('Receipt unavailable'))
    await expect(query().queryFn()).rejects.toThrow('Receipt unavailable')
  })
})

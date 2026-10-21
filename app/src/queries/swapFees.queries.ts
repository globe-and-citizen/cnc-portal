import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries } from '@tanstack/vue-query'
import { getPublicClient } from '@wagmi/core'
import externalApiClient from '@/lib/external.axios'
import { config } from '@/wagmi.config'
import { currentChainId, NETWORK } from '@/constant'
import { queryPresets } from './queryFactory'
import {
  cowApiUrl,
  cowOrdersSchema,
  cowTradesFromReceipt,
  cowTradesSchema,
  type CowTrade
} from '@/utils/safe/cowSettlement'
import type { SwapExecution } from '@/types/swapFees'

/** A mined receipt never changes: read it once per swap, without polling. */
export async function fetchSwapExecution(hash: string, chainId = currentChainId) {
  const client = getPublicClient(config, { chainId })
  if (!client) throw new Error('Swap settlement is unavailable')
  const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` })
  if (receipt.status !== 'success') throw new Error('Swap execution did not succeed')
  return {
    chainId,
    transactionHash: hash.toLowerCase(),
    blockNumber: receipt.blockNumber.toString(),
    cowTrades: cowTradesFromReceipt(receipt, chainId),
    ...(typeof receipt.gasUsed === 'bigint' && typeof receipt.effectiveGasPrice === 'bigint'
      ? {
          networkFee: {
            rawAmount: (receipt.gasUsed * receipt.effectiveGasPrice).toString(),
            symbol: chainId === 137 ? 'POL' : NETWORK.currencySymbol,
            decimals: 18,
            payer: receipt.from
          }
        }
      : {})
  } satisfies SwapExecution
}

/** Settlement receipt of each Safe swap; shared by Accounting and the Safe page. */
export function useGetSwapExecutionsQuery(hashes: MaybeRefOrGetter<readonly string[]>) {
  const unique = computed(() => [...new Set(toValue(hashes).map((hash) => hash.toLowerCase()))])
  return useQueries({
    queries: computed(() =>
      unique.value.map((hash) => ({
        ...queryPresets.once,
        queryKey: ['swap-execution', currentChainId, hash],
        gcTime: Infinity,
        queryFn: () => fetchSwapExecution(hash)
      }))
    ),
    combine: (queries) => queries.map((query, index) => ({ ...query, hash: unique.value[index]! }))
  })
}

export async function fetchCowOrders(chainId: number, hash: string, signal?: AbortSignal) {
  const base = cowApiUrl(chainId)
  if (!base || !/^0x[\da-f]{64}$/i.test(hash)) throw new Error('Swap fee provider unavailable')
  const { data } = await externalApiClient.get(
    `${base}/api/v1/transactions/${hash.toLowerCase()}/orders`,
    { signal }
  )
  return cowOrdersSchema.parse(data)
}

/** GET /api/v1/transactions/{txHash}/orders */
export function useGetCowOrdersQuery(params: {
  chainId: MaybeRefOrGetter<number>
  hashes: MaybeRefOrGetter<readonly string[]>
}) {
  const unique = computed(() => [...new Set(toValue(params.hashes))])
  return useQueries({
    queries: computed(() =>
      unique.value.map((hash) => ({
        ...queryPresets.once,
        queryKey: ['cow-orders', toValue(params.chainId), hash.toLowerCase()],
        enabled: !!cowApiUrl(toValue(params.chainId)),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          fetchCowOrders(toValue(params.chainId), hash, signal)
      }))
    ),
    combine: (queries) => queries.map((query, index) => ({ ...query, hash: unique.value[index]! }))
  })
}

export async function fetchCowTrades(
  chainId: number,
  orderUid: string,
  signal?: AbortSignal
): Promise<CowTrade[]> {
  const base = cowApiUrl(chainId)
  if (!base || !/^0x[\da-f]{112}$/i.test(orderUid)) throw new Error('Swap fee order unavailable')
  const trades: CowTrade[] = []
  const seen = new Set<string>()
  for (let offset = 0; ; offset += 100) {
    const { data } = await externalApiClient.get(`${base}/api/v2/trades`, {
      params: { orderUid: orderUid.toLowerCase(), offset, limit: 100 },
      signal
    })
    const page = cowTradesSchema.parse(data)
    for (const trade of page) {
      if (trade.orderUid !== orderUid.toLowerCase())
        throw new Error('Mismatched swap order evidence')
      const key = `${trade.txHash}:${trade.logIndex}`
      if (seen.has(key)) throw new Error('Duplicate swap execution evidence')
      seen.add(key)
      trades.push(trade)
    }
    if (page.length < 100) return trades
  }
}

/** GET /api/v2/trades?orderUid=…; complete order history prevents assigning cumulative fees to one fill. */
export function useGetCowTradesQuery(params: {
  chainId: MaybeRefOrGetter<number>
  orderUids: MaybeRefOrGetter<readonly string[]>
}) {
  const unique = computed(() => [...new Set(toValue(params.orderUids))])
  return useQueries({
    queries: computed(() =>
      unique.value.map((orderUid) => ({
        ...queryPresets.once,
        queryKey: ['cow-trades', toValue(params.chainId), orderUid.toLowerCase()],
        enabled: !!cowApiUrl(toValue(params.chainId)),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          fetchCowTrades(toValue(params.chainId), orderUid, signal)
      }))
    ),
    combine: (queries) =>
      queries.map((query, index) => ({ ...query, orderUid: unique.value[index]! }))
  })
}

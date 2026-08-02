import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useChainId } from '@wagmi/vue'
import { useQuery } from '@tanstack/vue-query'
import type { Address } from 'viem'
import { config as wagmiConfig } from '@/wagmi.config'
import { useCurrencyStore } from '@/stores'
import { SUPPORTED_TOKENS, type TokenId } from '@/constant'
import { fetchTokenBalances, toContractBalances } from '@/lib/balances/tokenBalances'
import type { ContractBalances } from '@/types'

export type { ContractBalances, TokenBalance, CurrencyPair, Money } from '@/types'

/** Refresh cadence for a balance that nothing on screen just changed. */
const REFETCH_INTERVAL = 300_000

/**
 * Query keys for contract balances.
 *
 * The shape is deliberately the one wagmi's `useBalance` used to store —
 * `['balance', { address, chainId }]` — because a dozen call sites invalidate
 * that key by hand after a transfer, deposit or withdrawal. Keeping it means
 * those keep working; TanStack's partial matching also makes the bare
 * `['balance']` prefix a valid "refresh every balance" sweep (see
 * `useCashOutAll`).
 *
 * Prefer this factory over hand-written literals at new call sites.
 */
export const contractBalanceKeys = {
  all: ['balance'] as const,
  detail: (address: Address | undefined, chainId: number | undefined) =>
    ['balance', { address, chainId }] as const
}

/**
 * Balances of every supported token held by `address`, priced in the currencies
 * exposed by the currency store.
 *
 * Returns the TanStack query itself — `status`, `isLoading`, `error`,
 * `refetch`, `dataUpdatedAt`… are all the standard ones — with one twist:
 * `data` holds the **priced** balances (`{ balances, total }`), not the raw
 * payload. The query caches raw bigints; `data` is a `computed` over them, so
 * it re-derives when the user switches currency or prices refresh, with no
 * refetch. It is `undefined` until the first successful read, per TanStack
 * semantics — a balance still loading is distinguishable from a balance of 0.
 *
 * One query covers every token: the reads are issued through `@wagmi/core` in
 * a single tick, so they cost one JSON-RPC round-trip and share a single
 * loading/error state. A failing read fails the whole query rather than
 * reporting a silent 0.
 *
 * `address` may be a ref/getter — the query re-keys and refetches when it
 * changes, and stays disabled while it is undefined.
 */
export function useContractBalance(address: MaybeRefOrGetter<Address | undefined>) {
  const chainId = useChainId()
  const currencyStore = useCurrencyStore()
  const contractAddress = computed(() => toValue(address))

  const query = useQuery({
    queryKey: computed(() => contractBalanceKeys.detail(contractAddress.value, chainId.value)),
    enabled: computed(() => !!contractAddress.value),
    refetchInterval: REFETCH_INTERVAL,
    queryFn: () =>
      fetchTokenBalances(wagmiConfig, {
        address: contractAddress.value as Address,
        chainId: chainId.value,
        tokens: SUPPORTED_TOKENS
      })
  })

  const data = computed<ContractBalances | undefined>(() => {
    const raw = query.data.value
    if (!raw) return undefined
    return toContractBalances(SUPPORTED_TOKENS, raw, (tokenId: TokenId) =>
      currencyStore.getTokenInfo(tokenId)
    )
  })

  return { ...query, data }
}

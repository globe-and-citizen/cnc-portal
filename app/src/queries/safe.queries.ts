import { useQuery } from '@tanstack/vue-query'
import { computed, toValue } from 'vue'
import { erc20Abi, isAddress, type Address } from 'viem'
import { contractBalanceKeys } from '@/composables/useContractBalance'
import { failureDetails, getSafeRead } from '@/lib/externalReads'
import { queryClient } from './queryClient'
import { normalizeSafeAddress } from '@/utils/safe/address'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import type { SafeInfo, SafeTransaction } from '@/types/safe'
import { TX_SERVICE_BY_CHAIN } from '@/types/safe'
import { currentChainId } from '@/constant/index'
import type {
  GetSafeTransactionParams,
  GetSafeInfoParams,
  GetSafeTransactionsParams,
  GetSafeIncomingTransfersParams,
  GetSafeOutgoingTransactionsParams,
  SafeIncomingTransfer
} from '@/types'

const chainId = currentChainId
const txService = TX_SERVICE_BY_CHAIN[chainId]

interface SafePage<T> {
  next: string | null
  results: T[]
}

const safeAddressKey = (address: string | undefined): string | undefined =>
  address && isAddress(address.trim()) ? normalizeSafeAddress(address) : address

function requireSafeAddress(address: string | undefined): Address {
  if (!address) throw new Error('Missing Safe address')
  return normalizeSafeAddress(address)
}

/** Load every page in service order; a repeated next link is an invalid partial response. */
async function fetchAllSafePages<T>(initialUrl: string, signal: AbortSignal): Promise<T[]> {
  const visited = new Set<string>()
  const results: T[] = []
  let pageUrl: string | null = initialUrl

  while (pageUrl) {
    if (visited.has(pageUrl)) throw new Error('Safe pagination returned a repeated page')
    visited.add(pageUrl)

    const currentUrl: string = pageUrl
    const { data } = await getSafeRead<SafePage<T>>(currentUrl, signal)
    results.push(...(data.results ?? []))
    pageUrl = data.next ? new URL(data.next, currentUrl).toString() : null
  }

  return results
}

/**
 * Query key factory for safe-related queries
 */
export const safeKeys = {
  transfers: (safeAddress: string | undefined, networkId: number) =>
    [
      'safe',
      'asset-transfers',
      { safeAddress: safeAddressKey(safeAddress), chainId: networkId }
    ] as const,
  all: ['safe'] as const,
  infos: () => [...safeKeys.all, 'info'] as const,
  info: (safeAddress: string | undefined) =>
    [...safeKeys.infos(), { safeAddress: safeAddressKey(safeAddress) }] as const,
  transactionLists: () => [...safeKeys.all, 'transactions'] as const,
  transactions: (safeAddress: string | undefined) =>
    [...safeKeys.transactionLists(), { safeAddress: safeAddressKey(safeAddress) }] as const,
  transactionDetails: () => [...safeKeys.all, 'transaction'] as const,
  transaction: (safeTxHash: string | undefined) =>
    [...safeKeys.transactionDetails(), { safeTxHash }] as const,
  incomingTransferLists: () => [...safeKeys.all, 'incoming-transfers'] as const,
  incomingTransfers: (safeAddress: string | undefined, limit?: number) =>
    [
      ...safeKeys.incomingTransferLists(),
      { safeAddress: safeAddressKey(safeAddress), ...(limit === undefined ? {} : { limit }) }
    ] as const,
  outgoingTransactionLists: () => [...safeKeys.all, 'outgoing-transactions'] as const,
  outgoingTransactions: (safeAddress: string | undefined, limit?: number) =>
    [
      ...safeKeys.outgoingTransactionLists(),
      { safeAddress: safeAddressKey(safeAddress), ...(limit === undefined ? {} : { limit }) }
    ] as const,
  /**
   * The Safe's token holdings — native and ERC-20 alike — live on the one key
   * `useContractBalance` owns, so this delegates rather than restating it.
   */
  balance: (address: string | undefined, chainId: number | undefined) =>
    contractBalanceKeys.detail(safeAddressKey(address) as Address | undefined, chainId)
}

/** All real native/ERC-20 movements; swap settlement can happen outside a direct Safe call. */
export function useGetSafeTransfersQuery(params: GetSafeIncomingTransfersParams) {
  const safeAddress = computed(() => toValue(params.pathParams.safeAddress))
  return useQuery<SafeIncomingTransfer[]>({
    queryKey: computed(() => safeKeys.transfers(safeAddress.value, chainId)),
    enabled: computed(() => Boolean(safeAddress.value)),
    queryFn: async ({ signal }) => {
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)
      const address = requireSafeAddress(safeAddress.value)
      const rows = await fetchAllSafePages<SafeIncomingTransfer>(
        `${txService.url}/api/v1/safes/${address}/transfers/?limit=${params.queryParams?.limit ?? 500}`,
        signal
      )
      const unique = new Map<string, SafeIncomingTransfer>()
      for (const row of rows) {
        if (!row.transferId) throw new Error('Safe transfer identity unavailable')
        unique.set(row.transferId, row)
      }
      const transfers = [...unique.values()]
      const missing = new Map<string, SafeIncomingTransfer[]>()
      for (const row of transfers) {
        if (row.type !== 'ERC20_TRANSFER' || !row.tokenAddress || !isAddress(row.tokenAddress))
          continue
        if (
          row.tokenInfo?.address?.toLowerCase() === row.tokenAddress.toLowerCase() &&
          Number.isInteger(row.tokenInfo.decimals) &&
          row.tokenInfo.decimals >= 0 &&
          row.tokenInfo.decimals <= 18
        )
          continue
        const bucket = missing.get(row.tokenAddress.toLowerCase()) ?? []
        bucket.push(row)
        missing.set(row.tokenAddress.toLowerCase(), bucket)
      }
      await Promise.all(
        [...missing].map(async ([tokenAddress, rows]) => {
          try {
            const token = tokenAddress as Address
            const [decimals, symbol, name] = await queryClient.fetchQuery({
              queryKey: ['safe-token-metadata', chainId, tokenAddress],
              staleTime: 24 * 60 * 60_000,
              gcTime: 24 * 60 * 60_000,
              retry: false,
              queryFn: () =>
                Promise.all([
                  readContract(config, {
                    address: token,
                    abi: erc20Abi,
                    functionName: 'decimals',
                    chainId
                  }),
                  readContract(config, {
                    address: token,
                    abi: erc20Abi,
                    functionName: 'symbol',
                    chainId
                  }).catch(() => tokenAddress),
                  readContract(config, {
                    address: token,
                    abi: erc20Abi,
                    functionName: 'name',
                    chainId
                  }).catch(() => 'Unknown token')
                ])
            })
            for (const row of rows)
              row.tokenInfo = {
                type: 'ERC20',
                address: tokenAddress,
                name,
                symbol,
                decimals,
                ...(row.tokenInfo?.address?.toLowerCase() === tokenAddress.toLowerCase() &&
                row.tokenInfo.logoUri
                  ? { logoUri: row.tokenInfo.logoUri }
                  : {}),
                ...(row.tokenInfo?.trusted === false ? { trusted: false } : {})
              }
          } catch {
            /* Retain raw movements with an explicit metadata diagnostic. */
          }
        })
      )
      return transfers
    },
    staleTime: 300_000,
    gcTime: 30 * 60_000,
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) =>
      failureCount < 1 && (failureDetails(error).status ?? 500) >= 500,
    retryDelay: 5000
  })
}

// ============================================================================
// GET /api/v1/safes/{safeAddress}/ - Fetch Safe info
// ============================================================================

/**
 * Fetch Safe information from Transaction Service
 *
 * @endpoint GET {txService.url}/api/v1/safes/{safeAddress}/
 * @pathParams { safeAddress: string }
 * @queryParams none
 * @body none
 */
export function useGetSafeInfoQuery(params: GetSafeInfoParams) {
  const safeAddress = computed(() => toValue(params.pathParams.safeAddress))

  return useQuery<SafeInfo>({
    queryKey: computed(() => safeKeys.info(safeAddress.value)),
    enabled: computed(() => Boolean(safeAddress.value)),
    queryFn: async ({ signal }) => {
      const address = requireSafeAddress(safeAddress.value)
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      const { data } = await getSafeRead<SafeInfo>(
        `${txService.url}/api/v1/safes/${address}/`,
        signal
      )
      return data
    },
    staleTime: 300_000,
    gcTime: 30 * 60_000,
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) =>
      failureCount < 1 && (failureDetails(error).status ?? 500) >= 500,
    retryDelay: 5000
  })
}

// ============================================================================
// GET /api/v1/safes/{safeAddress}/multisig-transactions - Fetch transactions
// ============================================================================

/**
 * Fetch Safe pending transactions from Transaction Service
 *
 * @endpoint GET {txService.url}/api/v1/safes/{safeAddress}/multisig-transactions
 * @pathParams { safeAddress: string }
 * @queryParams none
 * @body none
 */
export function useGetSafeTransactionsQuery(params: GetSafeTransactionsParams) {
  const safeAddress = computed(() => toValue(params.pathParams.safeAddress))

  return useQuery<SafeTransaction[]>({
    queryKey: computed(() => safeKeys.transactions(safeAddress.value)),
    enabled: computed(() => Boolean(safeAddress.value)),
    queryFn: async ({ signal }) => {
      const address = requireSafeAddress(safeAddress.value)
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      const { data } = await getSafeRead<{ results: SafeTransaction[] }>(
        `${txService.url}/api/v1/safes/${address}/multisig-transactions`,
        signal
      )
      return data.results || []
    },
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) =>
      failureCount < 1 && (failureDetails(error).status ?? 500) >= 500,
    retryDelay: 5000,
    refetchInterval: (query) =>
      query.state.data?.some((transaction) => !transaction.isExecuted) ? 60_000 : 300_000
  })
}

// ============================================================================
// GET /api/v1/multisig-transactions/{safeTxHash}/ - Fetch single transaction
// ============================================================================

/**
 * Fetch single Safe transaction by hash from Transaction Service
 *
 * @endpoint GET {txService.url}/api/v1/multisig-transactions/{safeTxHash}/
 * @pathParams { safeTxHash: string }
 * @queryParams none
 * @body none
 */
export function useGetSafeTransactionQuery(params: GetSafeTransactionParams) {
  const { pathParams } = params

  return useQuery<SafeTransaction>({
    queryKey: computed(() => safeKeys.transaction(toValue(pathParams.safeTxHash))),
    enabled: computed(() => !!toValue(pathParams.safeTxHash)),
    queryFn: async ({ signal }) => {
      const hash = toValue(pathParams.safeTxHash)
      if (!hash) throw new Error('Missing Safe transaction hash or chain ID')

      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      const { data } = await getSafeRead<SafeTransaction>(
        `${txService.url}/api/v1/multisig-transactions/${hash}/`,
        signal
      )
      return data
    },
    staleTime: 300_000,
    gcTime: 30 * 60_000,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) =>
      failureCount < 1 && (failureDetails(error).status ?? 500) >= 500,
    retryDelay: 5000
  })
}

// ============================================================================
// GET /api/v1/safes/{safeAddress}/incoming-transfers/ - Fetch incoming transfers
// ============================================================================

/**
 * Fetch Safe incoming transfers from Transaction Service
 *
 * @endpoint GET {txService.url}/api/v1/safes/{safeAddress}/incoming-transfers/
 * @pathParams { safeAddress: string }
 * @queryParams { limit?: number }
 * @body none
 */
export function useGetSafeIncomingTransfersQuery(params: GetSafeIncomingTransfersParams) {
  const { pathParams, queryParams } = params
  const safeAddress = computed(() => toValue(pathParams.safeAddress))

  return useQuery<SafeIncomingTransfer[]>({
    queryKey: computed(() => safeKeys.incomingTransfers(safeAddress.value, queryParams?.limit)),
    enabled: computed(() => Boolean(safeAddress.value)),
    queryFn: async ({ signal }) => {
      const address = requireSafeAddress(safeAddress.value)
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      // Only use limit parameter
      const params = new URLSearchParams()
      if (queryParams?.limit) params.append('limit', queryParams.limit.toString())

      const queryString = params.toString() ? `?${params.toString()}` : ''
      return fetchAllSafePages<SafeIncomingTransfer>(
        `${txService.url}/api/v1/safes/${address}/incoming-transfers/${queryString}`,
        signal
      )
    },
    staleTime: 300_000,
    gcTime: 30 * 60_000,
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) =>
      failureCount < 1 && (failureDetails(error).status ?? 500) >= 500,
    retryDelay: 5000
  })
}

// ============================================================================
// GET /api/v1/safes/{safeAddress}/multisig-transactions - Executed outgoing txs
// ============================================================================

export function useGetSafeOutgoingTransactionsQuery(params: GetSafeOutgoingTransactionsParams) {
  const { pathParams, queryParams } = params
  const safeAddress = computed(() => toValue(pathParams.safeAddress))

  return useQuery<SafeTransaction[]>({
    queryKey: computed(() => safeKeys.outgoingTransactions(safeAddress.value, queryParams?.limit)),
    enabled: computed(() => Boolean(safeAddress.value)),
    queryFn: async ({ signal }) => {
      const address = requireSafeAddress(safeAddress.value)
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      const qp = new URLSearchParams({ executed: 'true' })
      if (queryParams?.limit) qp.append('limit', queryParams.limit.toString())

      return fetchAllSafePages<SafeTransaction>(
        `${txService.url}/api/v1/safes/${address}/multisig-transactions/?${qp.toString()}`,
        signal
      )
    },
    staleTime: 300_000,
    gcTime: 30 * 60_000,
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) =>
      failureCount < 1 && (failureDetails(error).status ?? 500) >= 500,
    retryDelay: 5000
  })
}

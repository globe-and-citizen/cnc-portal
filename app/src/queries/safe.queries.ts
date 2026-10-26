import { useQueries, useQuery, useQueryClient, type QueryClient } from '@tanstack/vue-query'
import { getBytecode } from '@wagmi/core'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { isAddress, type Address } from 'viem'
import { config } from '@/wagmi.config'
import { contractBalanceKeys } from '@/composables/useContractBalance'
import externalApiClient from '@/lib/external.axios'
import { normalizeSafeAddress } from '@/utils/safe/address'
import { TX_SERVICE_BY_CHAIN, type SafeInfo, type SafeTransaction } from '@/types/safe'
import { currentChainId } from '@/constant/index'
import { queryPresets } from './queryFactory'
import { retrySafeRead, safeReadRetryDelay } from './safe.recovery'
import { fetchAllSafePages, fetchSafeAssetTransfers } from './safe.fetch'
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

const safeAddressKey = (address: string | undefined): string | undefined =>
  address && isAddress(address.trim()) ? normalizeSafeAddress(address) : address

function requireSafeAddress(address: string | undefined): Address {
  if (!address) throw new Error('Missing Safe address')
  return normalizeSafeAddress(address)
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
  bytecode: (safeAddress: string | undefined) =>
    [...safeKeys.all, 'bytecode', { safeAddress: safeAddressKey(safeAddress), chainId }] as const,
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
   * Delegate the canonical wallet balance prefix. Gateway holdings append their
   * provider and fiat currency, so existing operation invalidations reach them too.
   */
  balance: (address: string | undefined, chainId: number | undefined) =>
    contractBalanceKeys.detail(safeAddressKey(address) as Address | undefined, chainId)
}

/** One Safe's movements query, shared by the single-Safe and every-Safe hooks. */
function safeTransfersQueryOptions(
  queryClient: QueryClient,
  safeAddress: string | undefined,
  limit = 500
) {
  return {
    ...queryPresets.moderate,
    retry: retrySafeRead,
    retryDelay: safeReadRetryDelay,
    refetchInterval: 300_000,
    queryKey: safeKeys.transfers(safeAddress, chainId),
    enabled: Boolean(safeAddress),
    queryFn: async ({ signal }: { signal: AbortSignal }): Promise<SafeIncomingTransfer[]> => {
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)
      return fetchSafeAssetTransfers(queryClient, requireSafeAddress(safeAddress), limit, signal)
    }
  }
}

/** All real native/ERC-20 movements; swap settlement can happen outside a direct Safe call. */
export function useGetSafeTransfersQuery(params: GetSafeIncomingTransfersParams) {
  const queryClient = useQueryClient()
  return useQuery<SafeIncomingTransfer[]>(
    computed(() =>
      safeTransfersQueryOptions(
        queryClient,
        toValue(params.pathParams.safeAddress),
        params.queryParams?.limit
      )
    )
  )
}

/** The movements of several Safes, each in the same cache entry as its single-Safe query. */
export function useGetSafesTransfersQuery(
  safeAddresses: MaybeRefOrGetter<readonly string[]>,
  limit?: number
) {
  const queryClient = useQueryClient()
  return useQueries({
    queries: computed(() =>
      toValue(safeAddresses).map((address) =>
        safeTransfersQueryOptions(queryClient, address, limit)
      )
    )
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
    ...queryPresets.moderate,
    retry: retrySafeRead,
    retryDelay: safeReadRetryDelay,
    refetchInterval: 300_000,
    queryKey: computed(() => safeKeys.info(safeAddress.value)),
    enabled: computed(() => Boolean(safeAddress.value)),
    queryFn: async ({ signal }) => {
      const address = requireSafeAddress(safeAddress.value)
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      const { data } = await externalApiClient.get<SafeInfo>(
        `${txService.url}/api/v1/safes/${address}/`,
        { signal }
      )
      return data
    }
  })
}

// ============================================================================
// eth_getCode - Read the contract code deployed at the Safe address
// ============================================================================

/**
 * Read the code deployed at the Safe address on the configured chain. `0x`
 * means no contract exists there, whatever Safe services answer.
 *
 * @endpoint eth_getCode on the configured chain RPC
 * @pathParams { safeAddress: string }
 * @queryParams none
 * @body none
 */
export function useGetSafeBytecodeQuery(params: GetSafeInfoParams) {
  const safeAddress = computed(() => toValue(params.pathParams.safeAddress))

  return useQuery<string>({
    ...queryPresets.moderate,
    queryKey: computed(() => safeKeys.bytecode(safeAddress.value)),
    enabled: computed(() => Boolean(safeAddress.value)),
    queryFn: async () => {
      const address = requireSafeAddress(safeAddress.value)
      return (await getBytecode(config, { address, chainId })) ?? '0x'
    }
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
    ...queryPresets.moderate,
    retry: retrySafeRead,
    retryDelay: safeReadRetryDelay,

    queryKey: computed(() => safeKeys.transactions(safeAddress.value)),
    enabled: computed(() => Boolean(safeAddress.value)),
    queryFn: async ({ signal }) => {
      const address = requireSafeAddress(safeAddress.value)
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      const { data } = await externalApiClient.get<{ results: SafeTransaction[] }>(
        `${txService.url}/api/v1/safes/${address}/multisig-transactions/`,
        { signal }
      )
      return data.results || []
    },
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
    ...queryPresets.moderate,
    retry: retrySafeRead,
    retryDelay: safeReadRetryDelay,

    queryKey: computed(() => safeKeys.transaction(toValue(pathParams.safeTxHash))),
    enabled: computed(() => !!toValue(pathParams.safeTxHash)),
    queryFn: async ({ signal }) => {
      const hash = toValue(pathParams.safeTxHash)
      if (!hash) throw new Error('Missing Safe transaction hash or chain ID')

      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      const { data } = await externalApiClient.get<SafeTransaction>(
        `${txService.url}/api/v1/multisig-transactions/${hash}/`,
        { signal }
      )
      return data
    },
    refetchInterval: false
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
    ...queryPresets.moderate,

    refetchInterval: 300_000,
    retry: retrySafeRead,
    retryDelay: safeReadRetryDelay,
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
    }
  })
}

// ============================================================================
// GET /api/v1/safes/{safeAddress}/multisig-transactions - Executed outgoing txs
// ============================================================================

export function useGetSafeOutgoingTransactionsQuery(params: GetSafeOutgoingTransactionsParams) {
  const { pathParams, queryParams } = params
  const safeAddress = computed(() => toValue(pathParams.safeAddress))

  return useQuery<SafeTransaction[]>({
    ...queryPresets.moderate,

    refetchInterval: 300_000,
    retry: retrySafeRead,
    retryDelay: safeReadRetryDelay,
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
    }
  })
}

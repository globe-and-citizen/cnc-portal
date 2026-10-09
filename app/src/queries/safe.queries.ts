import { useQuery } from '@tanstack/vue-query'
import { computed, toValue } from 'vue'
import { isAddress, type Address } from 'viem'
import { contractBalanceKeys } from '@/composables/useContractBalance'
import { failureDetails, getSafeRead } from '@/lib/externalReads'
import { queryClient } from './queryClient'
import { normalizeSafeAddress } from '@/utils/safe/address'
import { excludeConfirmedSafeSpam } from '@/utils/safe/confirmedSpam'
import type { SafeInfo, SafeTransaction } from '@/types/safe'
import { TX_SERVICE_BY_CHAIN } from '@/types/safe'
import { currentChainId } from '@/constant/index'
import { fetchAllSafePages, fetchSafeAssetTransfers } from '@/lib/safeReads'
import { queryPresets } from './queryFactory'
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

/** All real native/ERC-20 movements; swap settlement can happen outside a direct Safe call. */
export function useGetSafeTransfersQuery(params: GetSafeIncomingTransfersParams) {
  const safeAddress = computed(() => toValue(params.pathParams.safeAddress))
  return useQuery<SafeIncomingTransfer[]>({
    ...queryPresets.moderate,
    queryKey: computed(() => safeKeys.transfers(safeAddress.value, chainId)),
    enabled: computed(() => Boolean(safeAddress.value)),
    select: (transfers) => excludeConfirmedSafeSpam(transfers, chainId),
    queryFn: async ({ signal }) => {
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)
      const address = requireSafeAddress(safeAddress.value)
      return fetchSafeAssetTransfers(
        queryClient,
        address,
        chainId,
        params.queryParams?.limit ?? 500,
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
    ...queryPresets.moderate,
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
    ...queryPresets.moderate,
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
    ...queryPresets.moderate,
    queryKey: computed(() => safeKeys.incomingTransfers(safeAddress.value, queryParams?.limit)),
    enabled: computed(() => Boolean(safeAddress.value)),
    select: (transfers) => excludeConfirmedSafeSpam(transfers, chainId),
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
    ...queryPresets.moderate,
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

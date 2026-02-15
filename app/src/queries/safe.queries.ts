import { useQuery } from '@tanstack/vue-query'
import { toValue } from 'vue'
import externalApiClient from '@/lib/external.axios.ts'
import type { SafeInfo, SafeTransaction } from '@/types/safe'
import { TX_SERVICE_BY_CHAIN } from '@/types/safe'
import { currentChainId } from '@/constant/index'
import type {
  GetSafeTransactionParams,
  GetSafeInfoParams,
  GetSafeTransactionsParams,
  GetSafeIncomingTransfersParams,
  SafeIncomingTransfersResponse,
  SafeIncomingTransfer
} from '@/types'

const chainId = currentChainId
const txService = TX_SERVICE_BY_CHAIN[chainId]

/**
 * Query key factory for safe-related queries
 */
export const safeKeys = {
  all: ['safe'] as const,
  infos: () => [...safeKeys.all, 'info'] as const,
  info: (safeAddress: string | undefined) => [...safeKeys.infos(), { safeAddress }] as const,
  transactionLists: () => [...safeKeys.all, 'transactions'] as const,
  transactions: (safeAddress: string | undefined) =>
    [...safeKeys.transactionLists(), { safeAddress }] as const,
  transactionDetails: () => [...safeKeys.all, 'transaction'] as const,
  transaction: (safeTxHash: string | undefined) =>
    [...safeKeys.transactionDetails(), { safeTxHash }] as const,
  incomingTransferLists: () => [...safeKeys.all, 'incoming-transfers'] as const,
  incomingTransfers: (safeAddress: string | undefined, limit?: number) =>
    [...safeKeys.incomingTransferLists(), { safeAddress, limit }] as const
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
  const { pathParams } = params

  return useQuery<SafeInfo>({
    queryKey: safeKeys.info(toValue(pathParams.safeAddress)),
    enabled: !!toValue(pathParams.safeAddress),
    queryFn: async () => {
      const address = toValue(pathParams.safeAddress)
      if (!address) throw new Error('Missing Safe address')
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      const { data } = await externalApiClient.get<SafeInfo>(
        `${txService.url}/api/v1/safes/${address}/`
      )
      return data
    },
    staleTime: 300_000,
    refetchInterval: 300_000
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
  const { pathParams } = params

  return useQuery<SafeTransaction[]>({
    queryKey: safeKeys.transactions(toValue(pathParams.safeAddress)),
    enabled: !!toValue(pathParams.safeAddress),
    queryFn: async () => {
      const address = toValue(pathParams.safeAddress)
      if (!address) throw new Error('Missing Safe address')
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      const { data } = await externalApiClient.get<{ results: SafeTransaction[] }>(
        `${txService.url}/api/v1/safes/${address}/multisig-transactions`
      )
      return data.results || []
    },
    staleTime: 300_000,
    refetchInterval: 300_000
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
    queryKey: safeKeys.transaction(toValue(pathParams.safeTxHash)),
    enabled: !!toValue(pathParams.safeTxHash),
    queryFn: async () => {
      const hash = toValue(pathParams.safeTxHash)
      if (!hash) throw new Error('Missing Safe transaction hash or chain ID')

      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      const { data } = await externalApiClient.get<SafeTransaction>(
        `${txService.url}/api/v1/multisig-transactions/${hash}/`
      )
      return data
    },
    staleTime: 300_000,
    gcTime: 300_000
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

  return useQuery<SafeIncomingTransfer[]>({
    queryKey: safeKeys.incomingTransfers(toValue(pathParams.safeAddress), queryParams?.limit),
    enabled: !!toValue(pathParams.safeAddress),
    queryFn: async () => {
      const address = toValue(pathParams.safeAddress)
      if (!address) throw new Error('Missing Safe address')
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      // Only use limit parameter
      const params = new URLSearchParams()
      if (queryParams?.limit) {
        params.append('limit', queryParams.limit.toString())
      }

      const queryString = params.toString() ? `?${params.toString()}` : ''
      const { data } = await externalApiClient.get<SafeIncomingTransfersResponse>(
        `${txService.url}/api/v1/safes/${address}/incoming-transfers/${queryString}`
      )
      return data.results || []
    },
    staleTime: 300_000,
    refetchInterval: 300_000
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import externalApiClient from '@/lib/external.axios.ts'
import type { SafeInfo, SafeTransaction, SafeSignature, SafeDeploymentParams } from '@/types/safe'
import { TX_SERVICE_BY_CHAIN, type ProposeTransactionParams } from '@/types/safe'
import { currentChainId } from '@/constant/index'

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
    [...safeKeys.transactionDetails(), { safeTxHash }] as const
}

// ============================================================================
// GET /api/v1/safes/{safeAddress}/ - Fetch Safe info
// ============================================================================

/**
 * Path parameters for Safe info endpoint
 */
export interface GetSafeInfoPathParams {
  /** Safe address */
  safeAddress: MaybeRefOrGetter<string | undefined>
}

/**
 * Query parameters for Safe info (none for this endpoint)
 */
export interface GetSafeInfoQueryParams {}

/**
 * Combined parameters for useGetSafeInfoQuery
 */
export interface GetSafeInfoParams {
  pathParams: GetSafeInfoPathParams
  queryParams?: GetSafeInfoQueryParams
}

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
 * Path parameters for Safe transactions endpoint
 */
export interface GetSafeTransactionsPathParams {
  /** Safe address */
  safeAddress: MaybeRefOrGetter<string | undefined>
}

/**
 * Query parameters for Safe transactions (none for this endpoint)
 */
export interface GetSafeTransactionsQueryParams {}

/**
 * Combined parameters for useGetSafeTransactionsQuery
 */
export interface GetSafeTransactionsParams {
  pathParams: GetSafeTransactionsPathParams
  queryParams?: GetSafeTransactionsQueryParams
}

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
// Deploy Safe - Mutation
// ============================================================================

/**
 * Mutation: Deploy a new Safe
 *
 * @endpoint N/A - Deployment logic implemented in composable
 * @pathParams none
 * @queryParams none
 * @body none
 */
export function useDeploySafeMutation() {
  const queryClient = useQueryClient()

  return useMutation<string, Error, SafeDeploymentParams>({
    mutationFn: async () => {
      // Deployment logic will be in the composable
      throw new Error('Deploy Safe logic must be implemented in composable')
    },
    onSuccess: (safeAddress) => {
      queryClient.invalidateQueries({
        queryKey: safeKeys.info(safeAddress)
      })
    }
  })
}

// ============================================================================
// POST /api/v1/multisig-transactions/{safeTxHash}/confirmations/ - Approve
// ============================================================================

/**
 * Path parameters for Safe transaction endpoints
 */
export interface SafeTransactionPathParams {
  /** Safe transaction hash */
  safeTxHash: string
}

/**
 * Request body for approving a transaction
 */
export interface ApproveTransactionBody {
  /** Signature data */
  signature: string
}

/**
 * Combined parameters for useApproveTransactionMutation
 */
export interface ApproveTransactionParams {
  pathParams: {
    /** Safe transaction hash */
    safeTxHash: string
    /** Safe address for query invalidation */
    safeAddress: string
  }
  queryParams: {
    /** Chain ID for transaction service lookup */
    chainId: number
  }
  body: {
    /** Signature data */
    signature: SafeSignature
  }
}

/**
 * Mutation: Approve a Safe transaction
 *
 * @endpoint POST {txService.url}/api/v1/multisig-transactions/{safeTxHash}/confirmations/
 * @pathParams { safeTxHash: string }
 * @queryParams { chainId: number }
 * @body { signature: string }
 */
export function useApproveTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, ApproveTransactionParams>({
    mutationFn: async (params: ApproveTransactionParams) => {
      const { pathParams, queryParams, body } = params
      const txService = TX_SERVICE_BY_CHAIN[queryParams.chainId]
      if (!txService) throw new Error(`Unsupported chainId: ${queryParams.chainId}`)

      await externalApiClient.post(
        `${txService.url}/api/v1/multisig-transactions/${pathParams.safeTxHash}/confirmations/`,
        { signature: body.signature.data }
      )
    },
    onSuccess: (_, variables) => {
      // Invalidate pending transactions
      queryClient.invalidateQueries({
        queryKey: safeKeys.transactions(variables.pathParams.safeAddress)
      })
    }
  })
}

// ============================================================================
// POST /api/v1/safes/{safeAddress}/multisig-transactions/ - Propose
// ============================================================================

/**
 * Request body for proposing a transaction
 */
export interface ProposeTransactionBody {
  /** Recipient address */
  to: string
  /** Transaction value */
  value: string
  /** Transaction data */
  data: string
  /** Operation type */
  operation: number
  /** Safe transaction gas */
  safeTxGas: string
  /** Base gas */
  baseGas: string
  /** Gas price */
  gasPrice: string
  /** Gas token address */
  gasToken: string
  /** Refund receiver address */
  refundReceiver: string
  /** Transaction nonce */
  nonce: number
  /** Contract transaction hash */
  contractTransactionHash: string
  /** Sender address */
  sender: string
  /** Signature */
  signature: string
  /** Origin information */
  origin: string | null
}

/**
 * Mutation: Propose a Safe transaction
 *
 * @endpoint POST {txService.url}/api/v1/safes/{safeAddress}/multisig-transactions/
 * @pathParams { safeAddress: string }
 * @queryParams none
 * @body ProposeTransactionBody - full transaction data
 */
export function useProposeTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, ProposeTransactionParams>({
    mutationFn: async (params) => {
      const { chainId, safeAddress, safeTxHash, transactionData, sender, signature, origin } =
        params
      const txServiceUrl = TX_SERVICE_BY_CHAIN[chainId]?.url

      if (!txServiceUrl) {
        throw new Error(`Transaction service not configured for chain ${chainId}`)
      }

      // Body: transaction data to propose
      const body: ProposeTransactionBody = {
        to: transactionData.to,
        value: transactionData.value,
        data: transactionData.data,
        operation: transactionData.operation,
        safeTxGas: transactionData.safeTxGas,
        baseGas: transactionData.baseGas,
        gasPrice: transactionData.gasPrice,
        gasToken: transactionData.gasToken,
        refundReceiver: transactionData.refundReceiver,
        nonce: transactionData.nonce,
        contractTransactionHash: safeTxHash,
        sender,
        signature,
        origin: origin || null
      }

      await externalApiClient.post(
        `${txServiceUrl}/api/v1/safes/${safeAddress}/multisig-transactions/`,
        body
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: safeKeys.transactions(variables.safeAddress)
      })
    }
  })
}

// ============================================================================
// Execute Safe transaction - Mutation
// ============================================================================

/**
 * Combined parameters for useExecuteTransactionMutation
 */
export interface ExecuteTransactionParams {
  pathParams: {
    /** Safe address for query invalidation */
    safeAddress: string
    /** Safe transaction hash */
    safeTxHash: string
  }
  queryParams: {
    /** Chain ID for transaction service lookup */
    chainId: number
  }
  body?: {
    /** Optional blockchain transaction hash */
    txHash?: string
  }
}

/**
 * Mutation: Execute a Safe transaction
 *
 * @endpoint N/A - Execution logic implemented in composable
 * @pathParams none
 * @queryParams none
 * @body none
 */
export function useExecuteTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, ExecuteTransactionParams>({
    mutationFn: async () => {
      // Actual execution happens in the composable
      // This mutation is just for query invalidation
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: safeKeys.info(variables.pathParams.safeAddress)
      })
      queryClient.invalidateQueries({
        queryKey: safeKeys.transactions(variables.pathParams.safeAddress)
      })
    }
  })
}

// ============================================================================
// Update Safe owners - Mutation
// ============================================================================

/**
 * Combined parameters for useUpdateSafeOwnersMutation
 */
export interface UpdateSafeOwnersParams {
  pathParams: {
    /** Safe address for query invalidation */
    safeAddress: string
  }
  queryParams: {
    /** Chain ID for transaction service lookup */
    chainId: number
  }
  body: {
    /** Owners to add */
    ownersToAdd?: string[]
    /** Owners to remove */
    ownersToRemove?: string[]
    /** New threshold */
    newThreshold?: number
    /** Whether to propose the transaction */
    shouldPropose?: boolean
    /** Safe transaction hash */
    safeTxHash?: string
    /** Signature data */
    signature?: SafeSignature | string
  }
}

/**
 * Mutation: Update Safe owners
 *
 * @endpoint N/A - Update logic implemented in composable
 * @pathParams none
 * @queryParams none
 * @body none
 */
export function useUpdateSafeOwnersMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, UpdateSafeOwnersParams>({
    mutationFn: async () => {
      // Actual update happens in the composable
      // This mutation is just for query invalidation
    },
    onSuccess: (_, variables) => {
      console.log('the variables in useUpdateSafeOwnersMutation onSuccess:', variables)

      queryClient.invalidateQueries({
        queryKey: safeKeys.info(variables.pathParams.safeAddress)
      })
      queryClient.invalidateQueries({
        queryKey: safeKeys.transactions(variables.pathParams.safeAddress)
      })
    }
  })
}

// ============================================================================
// GET /api/v1/multisig-transactions/{safeTxHash}/ - Fetch single transaction
// ============================================================================

/**
 * Path parameters for GET single transaction
 */
export interface GetSafeTransactionPathParams {
  /** Safe transaction hash */
  safeTxHash: MaybeRefOrGetter<string | undefined>
}

/**
 * Query parameters for GET single transaction (none for this endpoint)
 */
export interface GetSafeTransactionQueryParams {}

/**
 * Combined parameters for useGetSafeTransactionQuery
 */
export interface GetSafeTransactionParams {
  pathParams: GetSafeTransactionPathParams
  queryParams?: GetSafeTransactionQueryParams
}

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

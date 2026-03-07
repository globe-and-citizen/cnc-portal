import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { SafeSignature, SafeDeploymentParams } from '@/types/safe'
import { TX_SERVICE_BY_CHAIN, type ProposeTransactionParams } from '@/types/safe'
import externalApiClient from '@/lib/external.axios.ts'
import { safeKeys } from './safe.queries'
import type { ProposeTransactionBody, ExecuteTransactionParams } from '@/types'

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
        ...transactionData,
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

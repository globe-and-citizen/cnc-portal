import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { toValue } from 'vue'
import externalApiClient from '@/lib/external.axios.ts'
import type { SafeInfo, SafeTransaction, SafeSignature, SafeDeploymentParams } from '@/types/safe'
import { TX_SERVICE_BY_CHAIN, type ProposeTransactionParams } from '@/types/safe'
import { currentChainId } from '@/constant/index'

const chainId = currentChainId
const txService = TX_SERVICE_BY_CHAIN[chainId]

/**
 * Fetch Safe information from Transaction Service
 *
 * @endpoint GET {txService.url}/api/v1/safes/{safeAddress}/
 * @params { safeAddress: string } - URL path parameter
 * @queryParams none
 * @body none
 */
export function useSafeInfoQuery(safeAddress: MaybeRef<string | undefined>) {
  return useQuery<SafeInfo>({
    queryKey: ['safe', 'info', { safeAddress }],
    enabled: !!toValue(safeAddress),
    queryFn: async () => {
      const address = toValue(safeAddress)
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

/**
 * Fetch Safe pending transactions from Transaction Service
 *
 * @endpoint GET {txService.url}/api/v1/safes/{safeAddress}/multisig-transactions
 * @params { safeAddress: string } - URL path parameter
 * @queryParams none
 * @body none
 */
export function useSafeTransactionsQuery(safeAddress: MaybeRef<string | undefined>) {
  return useQuery<SafeTransaction[]>({
    queryKey: ['safe', 'transactions', { safeAddress }],
    enabled: !!toValue(safeAddress),
    queryFn: async () => {
      const address = toValue(safeAddress)
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

/**


/**
 * Mutation: Deploy a new Safe
 *
 * @endpoint N/A - Deployment logic implemented in composable
 * @params none
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
        queryKey: ['safe', 'info', { safeAddress }]
      })
    }
  })
}

/**
 * Mutation input for useApproveTransactionMutation
 */
export interface ApproveTransactionInput {
  /** Chain ID for transaction service lookup */
  chainId: number
  /** URL path parameter: Safe address */
  safeAddress: string
  /** URL path parameter: Safe transaction hash */
  safeTxHash: string
  /** Request body: signature data */
  signature: SafeSignature
}

/**
 * Mutation: Approve a Safe transaction
 *
 * @endpoint POST {txService.url}/api/v1/multisig-transactions/{safeTxHash}/confirmations/
 * @params { safeTxHash: string } - URL path parameter
 * @queryParams none
 * @body { signature: string }
 */
export function useApproveTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, ApproveTransactionInput>({
    mutationFn: async ({ chainId, safeTxHash, signature }) => {
      const txService = TX_SERVICE_BY_CHAIN[chainId]
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      await externalApiClient.post(
        `${txService.url}/api/v1/multisig-transactions/${safeTxHash}/confirmations/`,
        { signature: signature.data }
      )
    },
    onSuccess: (_, variables) => {
      // Invalidate pending transactions
      queryClient.invalidateQueries({
        queryKey: ['safe', 'transactions', { safeAddress: variables.safeAddress }]
      })
    }
  })
}

/**
 * Mutation: Propose a Safe transaction
 *
 * @endpoint POST {txService.url}/api/v1/safes/{safeAddress}/multisig-transactions/
 * @params { safeAddress: string } - URL path parameter
 * @queryParams none
 * @body ProposeTransactionParams - full transaction data
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
      const body = {
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
        queryKey: ['safe', 'transactions', { safeAddress: variables.safeAddress }]
      })
    }
  })
}

/**
 * Mutation input for useExecuteTransactionMutation
 */
export interface ExecuteTransactionInput {
  /** Chain ID for transaction service lookup */
  chainId: number
  /** Safe address for query invalidation */
  safeAddress: string
  /** Safe transaction hash */
  safeTxHash: string
  /** Optional blockchain transaction hash */
  txHash?: string
}

/**
 * Mutation: Execute a Safe transaction
 *
 * @endpoint N/A - Execution logic implemented in composable
 * @params none
 * @queryParams none
 * @body none
 */
export function useExecuteTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, ExecuteTransactionInput>({
    mutationFn: async () => {
      // Actual execution happens in the composable
      // This mutation is just for query invalidation
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['safe', 'info', { safeAddress: variables.safeAddress }]
      })
      queryClient.invalidateQueries({
        queryKey: ['safe', 'transactions', { safeAddress: variables.safeAddress }]
      })
    }
  })
}

/**
 * Mutation input for useUpdateSafeOwnersMutation
 */
export interface UpdateSafeOwnersInput {
  /** Chain ID for transaction service lookup */
  chainId: number
  /** Safe address for query invalidation */
  safeAddress: string
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

/**
 * Mutation: Update Safe owners
 *
 * @endpoint N/A - Update logic implemented in composable
 * @params none
 * @queryParams none
 * @body none
 */
export function useUpdateSafeOwnersMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, UpdateSafeOwnersInput>({
    mutationFn: async () => {
      // Actual update happens in the composable
      // This mutation is just for query invalidation
    },
    onSuccess: (_, variables) => {
      console.log('the variables in useUpdateSafeOwnersMutation onSuccess:', variables)

      queryClient.invalidateQueries({
        queryKey: ['safe', 'info', { safeAddress: variables.safeAddress }]
      })
      queryClient.invalidateQueries({
        queryKey: ['safe', 'transactions', { safeAddress: variables.safeAddress }]
      })
    }
  })
}

/**
 * Fetch single Safe transaction by hash from Transaction Service
 *
 * @endpoint GET {txService.url}/api/v1/multisig-transactions/{safeTxHash}/
 * @params { safeTxHash: string } - URL path parameter
 * @queryParams none
 * @body none
 */
export function useSafeTransactionQuery(safeTxHash: MaybeRef<string | undefined>) {
  return useQuery<SafeTransaction>({
    queryKey: ['safe', 'transaction', { safeTxHash }],
    enabled: !!toValue(safeTxHash),
    queryFn: async () => {
      const hash = toValue(safeTxHash)
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

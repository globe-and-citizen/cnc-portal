import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { toValue } from 'vue'
import externalApiClient from '@/lib/external.axios.ts'
import type { SafeInfo, SafeTransaction, SafeSignature, SafeDeploymentParams } from '@/types/safe'
import { TX_SERVICE_BY_CHAIN, type ProposeTransactionParams } from '@/types/safe'
import { currentChainId } from '@/constant/index'
// import currentChainId from const

const chainId = currentChainId
const txService = TX_SERVICE_BY_CHAIN[chainId]

/**
 * Fetch Safe information from Transaction Service
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
    staleTime: 10_000, // 30 seconds for pending transactions
    refetchInterval: 10_000 // Auto-refresh every 30 seconds
  })
}

/**
 * Fetch Safe pending transactions from Transaction Service
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
    staleTime: 30_000, // 30 seconds for pending transactions
    refetchInterval: 30_000 // Auto-refresh every 30 seconds
  })
}

/**


/**
 * Mutation: Deploy a new Safe
 */
export function useDeploySafeMutation() {
  const queryClient = useQueryClient()

  return useMutation<string, Error, SafeDeploymentParams>({
    mutationFn: async () => {
      // Deployment logic will be in the composable
      throw new Error('Deploy Safe logic must be implemented in composable')
    },
    onSuccess: (safeAddress) => {
      // Invalidate all Safe queries for the new address
      queryClient.invalidateQueries({
        queryKey: ['safe', 'info', { safeAddress }]
      })
    }
  })
}

/**
 * Mutation: Propose a Safe transaction
 */

/**
 * Mutation: Approve a Safe transaction
 */
export function useApproveTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    void,
    Error,
    {
      chainId: number
      safeAddress: string
      safeTxHash: string
      signature: SafeSignature
    }
  >({
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

      await externalApiClient.post(
        `${txServiceUrl}/api/v1/safes/${safeAddress}/multisig-transactions/`,
        {
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
 * Mutation: Execute a Safe transaction
 */
export function useExecuteTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    void,
    Error,
    { chainId: number; safeAddress: string; safeTxHash: string; txHash?: string }
  >({
    mutationFn: async () => {
      // Actual execution happens in the composable
      // This mutation is just for query invalidation
    },
    onSuccess: (_, variables) => {
      // Invalidate all Safe queries after execution
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
 * Mutation: Update Safe owners
 */
export function useUpdateSafeOwnersMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    void,
    Error,
    {
      chainId: number
      safeAddress: string
      ownersToAdd?: string[]
      ownersToRemove?: string[]
      newThreshold?: number
      shouldPropose?: boolean
      safeTxHash?: string
      signature?: SafeSignature | string
    }
  >({
    mutationFn: async () => {
      // Actual update happens in the composable
      // This mutation is just for query invalidation
    },
    onSuccess: (_, variables) => {
      console.log('the variables in useUpdateSafeOwnersMutation onSuccess:', variables)
      // Invalidate relevant queries

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
    staleTime: 60_000, // 1 minute
    gcTime: 300_000
  })
}

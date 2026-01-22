import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { unref, computed, toValue } from 'vue'
import externalApiClient from '@/lib/external.axios.ts'
import type { SafeInfo, SafeTransaction, SafeSignature, SafeDeploymentParams } from '@/types/safe'
import { TX_SERVICE_BY_CHAIN } from '@/types/safe'

// Query Keys
export const SAFE_QUERY_KEYS = {
  all: ['safe'] as const,
  info: (chainId: number, address: string) => ['safe', 'info', chainId, address] as const,
  owners: (chainId: number, address: string) => ['safe', 'owners', chainId, address] as const,
  threshold: (chainId: number, address: string) => ['safe', 'threshold', chainId, address] as const,
  transactions: (chainId: number, address: string, filter?: 'queued' | 'executed') =>
    ['safe', 'transactions', chainId, address, filter] as const,
  pendingTransactions: (chainId: number, address: string) =>
    ['safe', 'transactions', chainId, address, 'queued'] as const
}

/**
 * Fetch Safe information from Transaction Service
 */
export function useSafeInfoQuery(
  chainId: MaybeRef<number>,
  safeAddress: MaybeRef<string | undefined>
) {
  return useQuery<SafeInfo>({
    queryKey: ['safe', 'info', { chainId, safeAddress }],
    enabled: !!(toValue(safeAddress) && toValue(chainId)),
    queryFn: async () => {
      const address = toValue(safeAddress)
      const chain = toValue(chainId)
      if (!address || !chain) throw new Error('Missing Safe address or chain ID')

      const txService = TX_SERVICE_BY_CHAIN[chain]
      if (!txService) throw new Error(`Unsupported chainId: ${chain}`)

      const { data } = await externalApiClient.get<SafeInfo>(
        `${txService.url}/api/v1/safes/${address}/`
      )
      return data
    },
    staleTime: Infinity, // Owners change rarely; avoid periodic refetches
    gcTime: 24 * 60 * 60 * 1000,
    // Disable automatic refetch patterns
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true
  })
}

/**
 * Fetch Safe pending transactions from Transaction Service
 */
export function useSafePendingTransactionsQuery(
  chainId: MaybeRef<number>,
  safeAddress: MaybeRef<string | undefined>
) {
  const addressRef = computed(() => unref(safeAddress))
  const chainRef = computed(() => unref(chainId))

  return useQuery<SafeTransaction[]>({
    queryKey: computed(() =>
      addressRef.value && chainRef.value
        ? SAFE_QUERY_KEYS.pendingTransactions(chainRef.value, addressRef.value)
        : ['safe', 'transactions', 'disabled']
    ),
    enabled: computed(() => !!(addressRef.value && chainRef.value)),
    queryFn: async () => {
      const address = addressRef.value
      const chain = chainRef.value
      if (!address || !chain) throw new Error('Missing Safe address or chain ID')

      const txService = TX_SERVICE_BY_CHAIN[chain]
      if (!txService) throw new Error(`Unsupported chainId: ${chain}`)

      const { data } = await externalApiClient.get<{ results: SafeTransaction[] }>(
        `${txService.url}/api/v1/safes/${address}/multisig-transactions/?executed=false`
      )
      return data.results || []
    },
    staleTime: 30_000, // 30 seconds for pending transactions
    refetchInterval: 30_000 // Auto-refresh every 30 seconds
  })
}

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
    onSuccess: (safeAddress, variables) => {
      // Invalidate all Safe queries for the new address
      queryClient.invalidateQueries({
        queryKey: SAFE_QUERY_KEYS.info(variables.chainId, safeAddress)
      })
    }
  })
}

/**
 * Mutation: Propose a Safe transaction
 */
export function useProposeTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    string, // safeTxHash
    Error,
    {
      chainId: number
      safeAddress: string
      transactionData?: unknown
      safeTxHash?: string
      safeTx?: unknown
      signature: SafeSignature | string
    }
  >({
    mutationFn: async ({ chainId, safeAddress, transactionData, safeTx, signature }) => {
      const txService = TX_SERVICE_BY_CHAIN[chainId]
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      const resolvedSignature = typeof signature === 'string' ? signature : signature.data
      const resolvedTx = transactionData ?? safeTx

      const { data } = await externalApiClient.post(
        `${txService.url}/api/v1/safes/${safeAddress}/multisig-transactions/`,
        {
          ...(resolvedTx as Record<string, unknown>),
          signature: resolvedSignature
        }
      )
      return data.safeTxHash
    },
    onSuccess: (_, variables) => {
      // Invalidate pending transactions
      queryClient.invalidateQueries({
        queryKey: SAFE_QUERY_KEYS.pendingTransactions(variables.chainId, variables.safeAddress)
      })
    }
  })
}

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
        queryKey: SAFE_QUERY_KEYS.pendingTransactions(variables.chainId, variables.safeAddress)
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
        queryKey: SAFE_QUERY_KEYS.info(variables.chainId, variables.safeAddress)
      })
      queryClient.invalidateQueries({
        queryKey: SAFE_QUERY_KEYS.owners(variables.chainId, variables.safeAddress)
      })
      queryClient.invalidateQueries({
        queryKey: SAFE_QUERY_KEYS.threshold(variables.chainId, variables.safeAddress)
      })
      queryClient.invalidateQueries({
        queryKey: SAFE_QUERY_KEYS.pendingTransactions(variables.chainId, variables.safeAddress)
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
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: SAFE_QUERY_KEYS.owners(variables.chainId, variables.safeAddress)
      })
      queryClient.invalidateQueries({
        queryKey: SAFE_QUERY_KEYS.threshold(variables.chainId, variables.safeAddress)
      })
      queryClient.invalidateQueries({
        queryKey: SAFE_QUERY_KEYS.info(variables.chainId, variables.safeAddress)
      })
      if (variables.shouldPropose) {
        queryClient.invalidateQueries({
          queryKey: SAFE_QUERY_KEYS.pendingTransactions(variables.chainId, variables.safeAddress)
        })
      }
    }
  })
}

/**
 * Fetch single Safe transaction by hash from Transaction Service
 */
export function useSafeTransactionQuery(
  chainId: MaybeRef<number>,
  safeTxHash: MaybeRef<string | undefined>
) {
  const hashRef = computed(() => unref(safeTxHash))
  const chainRef = computed(() => unref(chainId))

  return useQuery<SafeTransaction>({
    queryKey: computed(() =>
      hashRef.value && chainRef.value
        ? ['safe', 'transaction', chainRef.value, hashRef.value]
        : ['safe', 'transaction', 'disabled']
    ),
    enabled: computed(() => !!(hashRef.value && chainRef.value)),
    queryFn: async () => {
      const hash = hashRef.value
      const chain = chainRef.value
      if (!hash || !chain) throw new Error('Missing Safe transaction hash or chain ID')

      const txService = TX_SERVICE_BY_CHAIN[chain]
      if (!txService) throw new Error(`Unsupported chainId: ${chain}`)

      const { data } = await externalApiClient.get<SafeTransaction>(
        `${txService.url}/api/v1/multisig-transactions/${hash}/`
      )
      return data
    },
    staleTime: 60_000, // 1 minute
    gcTime: 300_000
  })
}

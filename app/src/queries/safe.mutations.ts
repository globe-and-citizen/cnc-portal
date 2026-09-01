import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useChainId, useConnection } from '@wagmi/vue'
import { isAddress } from 'viem'
import externalApiClient from '@/lib/external.axios.ts'
import type {
  ExecuteTransactionParams,
  ApproveTransactionParams,
  UpdateSafeOwnersParams,
  TransferFromSafeParams,
  SafeExecutionResult
} from '@/types/safe.mutation'
import { transferFromSafeSchema } from '@/types/safe.schemas'
import { useSafeSDK } from '@/composables/safe/useSafeSdk'
import { getTokenAddress } from '@/utils/tokens/metadata'
import {
  buildOwnerManagementTransactions,
  buildTokenTransferData,
  executeSafeTransaction,
  extractTransactionHash,
  proposeSafeTransaction,
  waitForTransaction
} from '@/lib/safe/transactions'
import { getTxServiceUrl, transformToSafeMultisigResponse } from '@/utils/safe/model'
import { getConnectedSigner } from '@/utils/wallet/address'
import { safeKeys } from './safe.queries'

// ============================================================================
// POST /api/v1/multisig-transactions/{safeTxHash}/confirmations/ - Approve
// ============================================================================

/**
 * Mutation: Approve a Safe transaction
 *
 * @endpoint POST {txService.url}/api/v1/multisig-transactions/{safeTxHash}/confirmations/
 * @pathParams { safeAddress: string, safeTxHash: string }
 * @queryParams { chainId: number }
 * @body none
 */
export function useApproveTransactionMutation() {
  const queryClient = useQueryClient()
  const { loadSafe } = useSafeSDK()

  return useMutation<void, Error, ApproveTransactionParams>({
    mutationFn: async (params: ApproveTransactionParams) => {
      const { pathParams, queryParams } = params
      const { safeAddress, safeTxHash } = pathParams

      if (!safeTxHash) {
        throw new Error('Missing Safe transaction hash')
      }

      const txServiceUrl = getTxServiceUrl(queryParams.chainId)

      // Load Safe SDK and sign the transaction hash
      const safeSdk = await loadSafe(safeAddress)
      const signature = await safeSdk.signHash(safeTxHash)

      // Post signature to transaction service
      await externalApiClient.post(
        `${txServiceUrl}/api/v1/multisig-transactions/${safeTxHash}/confirmations/`,
        { signature: signature.data }
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: safeKeys.transactions(variables.pathParams.safeAddress)
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
 * @endpoint N/A - Execution via Safe SDK
 * @pathParams { safeAddress: string, safeTxHash: string }
 * @queryParams { chainId: number }
 * @body { transactionData: SafeTransaction }
 */
export function useExecuteTransactionMutation() {
  const queryClient = useQueryClient()
  const { loadSafe } = useSafeSDK()

  return useMutation<string, Error, ExecuteTransactionParams>({
    mutationFn: async (params: ExecuteTransactionParams) => {
      const { pathParams, body } = params
      const { safeAddress, safeTxHash } = pathParams
      const { transactionData } = body

      if (!safeTxHash) {
        throw new Error('Missing Safe transaction hash')
      }

      if (!transactionData) {
        throw new Error('Transaction data is required')
      }

      // Load Safe SDK instance
      const safeSdk = await loadSafe(safeAddress)

      // Transform and execute transaction
      const sdkTransactionData = transformToSafeMultisigResponse(transactionData)
      const txResponse = await safeSdk.executeTransaction(sdkTransactionData)
      const txHash = extractTransactionHash(txResponse)
      await waitForTransaction(txResponse)
      return txHash
    },
    onSuccess: async (_, variables) => {
      const chainId = variables.queryParams.chainId

      // One balance key per Safe now covers native and every ERC-20 it holds,
      // so an executed transfer needs no per-token invalidation.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: safeKeys.info(variables.pathParams.safeAddress)
        }),
        queryClient.invalidateQueries({
          queryKey: safeKeys.transactions(variables.pathParams.safeAddress)
        }),
        queryClient.invalidateQueries({
          queryKey: safeKeys.balance(variables.pathParams.safeAddress, chainId)
        })
      ])
    }
  })
}

// ============================================================================
// Update Safe owners - Mutation
// ============================================================================

/**
 * Mutation: Update Safe owners (add/remove owners, update threshold)
 *
 * @endpoint N/A - Safe SDK + Transaction Service
 * @pathParams { safeAddress: string }
 * @queryParams { chainId: number }
 * @body { ownersToAdd?, ownersToRemove?, newThreshold?, shouldPropose? }
 */
export function useUpdateSafeOwnersMutation() {
  const chainId = useChainId()
  const connection = useConnection()
  const queryClient = useQueryClient()
  const { loadSafe } = useSafeSDK()

  return useMutation<string, Error, UpdateSafeOwnersParams>({
    mutationFn: async (params: UpdateSafeOwnersParams) => {
      const { pathParams, body } = params
      const { safeAddress } = pathParams
      const { ownersToAdd = [], ownersToRemove = [], newThreshold, shouldPropose = true } = body

      if (ownersToAdd.length === 0 && ownersToRemove.length === 0 && newThreshold === undefined) {
        throw new Error('No owner management operations specified')
      }

      // Validate all addresses
      for (const owner of [...ownersToAdd, ...ownersToRemove]) {
        if (!isAddress(owner)) {
          throw new Error(`Invalid owner address: ${owner}`)
        }
      }

      // Load Safe SDK instance
      const safeSdk = await loadSafe(safeAddress)
      const currentThreshold = await safeSdk.getThreshold()

      const transactionData = await buildOwnerManagementTransactions({
        safeSdk,
        ownersToAdd,
        ownersToRemove,
        newThreshold,
        currentThreshold
      })

      if (transactionData.length === 0) {
        throw new Error('No owner management operations specified')
      }

      if (shouldPropose) {
        return proposeSafeTransaction({
          safeSdk,
          transactionData,
          chainId: chainId.value,
          safeAddress,
          signer: getConnectedSigner(connection)
        })
      }

      return executeSafeTransaction({
        safeSdk,
        transactionData
      })
    },
    onSuccess: (txHash, variables) => {
      queryClient.invalidateQueries({ queryKey: safeKeys.info(variables.pathParams.safeAddress) })
      queryClient.invalidateQueries({
        queryKey: safeKeys.transactions(variables.pathParams.safeAddress)
      })
    }
  })
}

// ============================================================================
// Transfer from Safe - Mutation
// ============================================================================

/**
 * Mutation: Transfer tokens or native currency from a Safe
 *
 * @endpoint N/A - Safe SDK + Transaction Service
 * @pathParams { safeAddress: string }
 * @queryParams none
 * @body { options: SafeTransferOptions }
 */
export function useTransferFromSafeMutation() {
  const chainId = useChainId()
  const connection = useConnection()
  const queryClient = useQueryClient()
  const { loadSafe } = useSafeSDK()

  return useMutation<SafeExecutionResult, Error, TransferFromSafeParams>({
    mutationFn: async (payload) => {
      const parsedPayload = transferFromSafeSchema.parse(payload)
      const { safeAddress: parsedSafeAddress } = parsedPayload.pathParams
      const { options: parsedOptions } = parsedPayload.body
      const { to, amount, tokenId = 'native' } = parsedOptions
      const tokenAddress = getTokenAddress(tokenId) ?? null
      const safeSdk = await loadSafe(parsedSafeAddress)
      const threshold = await safeSdk.getThreshold()

      // Use existing builder utility
      const transactionData = buildTokenTransferData({
        to,
        amount,
        tokenAddress,
        tokenId
      })

      if (threshold >= 2) {
        const hash = await proposeSafeTransaction({
          safeSdk,
          transactionData: [transactionData],
          chainId: chainId.value,
          safeAddress: parsedSafeAddress,
          signer: getConnectedSigner(connection)
        })
        return { hash, executed: false }
      }

      const hash = await executeSafeTransaction({
        safeSdk,
        transactionData: [transactionData]
      })
      return { hash, executed: true }
    },
    onSuccess: async (result, variables) => {
      // Pending transactions (needed for proposals when threshold >= 2)
      await queryClient.invalidateQueries({
        queryKey: safeKeys.transactions(variables.pathParams.safeAddress)
      })

      if (!result.executed) {
        return
      }

      // Covers the transferred token whichever it was: native and ERC-20
      // amounts share the Safe's single balance query.
      await queryClient.invalidateQueries({
        queryKey: safeKeys.balance(variables.pathParams.safeAddress, chainId.value)
      })
    }
  })
}

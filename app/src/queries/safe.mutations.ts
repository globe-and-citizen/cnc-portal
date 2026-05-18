import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useChainId } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useUserDataStore } from '@/stores'
import type { SafeDeploymentParams } from '@/types/safe'
import { SAFE_VERSION, TX_SERVICE_BY_CHAIN, type ProposeTransactionParams } from '@/types/safe'
import externalApiClient from '@/lib/external.axios.ts'
import { safeKeys } from './safe.queries'
import type {
  ProposeTransactionBody,
  ExecuteTransactionParams,
  ApproveTransactionParams,
  UpdateSafeOwnersParams,
  TransferFromSafeParams
} from '@/types/safe.mutation'
import { useSafeSDK } from '@/composables/safe/useSafeSdk'
import { getTokenAddress } from '@/utils'
import { buildTokenTransferData, proposeOrExecuteSafeTransaction } from '@/utils/safe.mutations'
import { randomSaltNonce, transformToSafeMultisigResponse } from '@/utils/safe'

// ============================================================================
// Deploy Safe - Mutation
// ============================================================================

/**
 * Mutation: Deploy a new Safe
 *
 * @endpoint N/A - Deployment via Safe SDK
 * @pathParams none
 * @queryParams none
 * @body { owners: string[], threshold: number }
 */
export function useDeploySafeMutation() {
  const queryClient = useQueryClient()
  const { deploySafe } = useSafeSDK()

  return useMutation<string, Error, SafeDeploymentParams>({
    mutationFn: async ({ owners, threshold }: SafeDeploymentParams) => {
      const safeSdk = await deploySafe(
        { owners, threshold },
        {
          saltNonce: randomSaltNonce(),
          safeVersion: SAFE_VERSION
        }
      )

      const deploymentTx = await safeSdk.createSafeDeploymentTransaction()
      const walletClient = await safeSdk.getSafeProvider().getExternalSigner()

      if (!walletClient) {
        throw new Error('Wallet signer not available')
      }

      const txHash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: deploymentTx.to as `0x${string}`,
        data: deploymentTx.data as `0x${string}`,
        value: BigInt(deploymentTx.value || '0'),
        chain: null
      })

      const publicClient = safeSdk.getSafeProvider().getExternalProvider()
      await publicClient.waitForTransactionReceipt({ hash: txHash })

      return safeSdk.getAddress()
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

      const txService = TX_SERVICE_BY_CHAIN[queryParams.chainId]
      if (!txService) throw new Error(`Unsupported chainId: ${queryParams.chainId}`)

      // Load Safe SDK and sign the transaction hash
      const safeSdk = await loadSafe(safeAddress)
      const signature = await safeSdk.signHash(safeTxHash)

      // Post signature to transaction service
      await externalApiClient.post(
        `${txService.url}/api/v1/multisig-transactions/${safeTxHash}/confirmations/`,
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

      // Extract transaction hash
      const txHash =
        (txResponse.transactionResponse as { hash?: string } | undefined)?.hash || txResponse.hash

      // Wait for confirmation if available
      const waitFn = (
        txResponse.transactionResponse as { wait?: () => Promise<unknown> } | undefined
      )?.wait

      if (typeof waitFn === 'function') {
        await waitFn()
      }

      return txHash
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
  const userStore = useUserDataStore()
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

      // Build the batch transaction data
      const transactionData: Array<{
        to: string
        value: string
        data: string
        operation: number
      }> = []

      // Add owners
      for (const owner of ownersToAdd) {
        const safeTx = await safeSdk.createAddOwnerTx({
          ownerAddress: owner as Address,
          threshold: newThreshold
        })
        transactionData.push({
          to: safeTx.data.to,
          value: safeTx.data.value,
          data: safeTx.data.data,
          operation: safeTx.data.operation || 0
        })
      }

      // Remove owners
      for (const owner of ownersToRemove) {
        const safeTx = await safeSdk.createRemoveOwnerTx({
          ownerAddress: owner as Address,
          threshold: newThreshold || currentThreshold
        })
        transactionData.push({
          to: safeTx.data.to,
          value: safeTx.data.value,
          data: safeTx.data.data,
          operation: safeTx.data.operation || 0
        })
      }

      // Update threshold when no owner operations provided
      if (ownersToAdd.length === 0 && ownersToRemove.length === 0 && newThreshold !== undefined) {
        const safeTx = await safeSdk.createChangeThresholdTx(newThreshold)
        transactionData.push({
          to: safeTx.data.to,
          value: safeTx.data.value,
          data: safeTx.data.data,
          operation: safeTx.data.operation || 0
        })
      }

      if (transactionData.length === 0) {
        throw new Error('No owner management operations specified')
      }

      // Use proposeOrExecuteSafeTransaction utility
      return proposeOrExecuteSafeTransaction({
        safeSdk,
        transactionData,
        shouldPropose,
        chainId: chainId.value,
        safeAddress,
        signer: userStore.address!
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
  const userStore = useUserDataStore()
  const queryClient = useQueryClient()
  const { loadSafe } = useSafeSDK()

  return useMutation<string, Error, TransferFromSafeParams>({
    mutationFn: async ({ safeAddress, options }) => {
      const { to, amount, tokenId = 'native' } = options
      const tokenAddress = getTokenAddress(tokenId) ?? null
      const safeSdk = await loadSafe(safeAddress)
      const threshold = await safeSdk.getThreshold()

      // Use existing builder utility
      const transactionData = buildTokenTransferData({
        to,
        amount,
        tokenAddress,
        tokenId
      })

      // Use existing propose-or-execute helper
      return proposeOrExecuteSafeTransaction({
        safeSdk,
        transactionData: [transactionData],
        shouldPropose: threshold >= 2,
        chainId: chainId.value,
        safeAddress,
        signer: userStore.address!
      })
    },
    onSuccess: (_, variables) => {
      // Pending transactions (needed for proposals when threshold >= 2)
      queryClient.invalidateQueries({ queryKey: safeKeys.transactions(variables.safeAddress) })
      // Safe balance (always changes after transfer)
      queryClient.invalidateQueries({
        queryKey: ['balance', { address: variables.safeAddress, chainId: chainId.value }]
      })
    }
  })
}

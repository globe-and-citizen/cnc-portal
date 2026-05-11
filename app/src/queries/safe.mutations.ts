import Safe, { type SafeAccountConfig } from '@safe-global/protocol-kit'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useChainId, useConnection } from '@wagmi/vue'
import { isAddress } from 'viem'

import externalApiClient from '@/lib/external.axios.ts'
import type {
  ProposeTransactionBody,
  SafeMultisigTransactionResponse,
  SafeSignature,
  SafeTransaction
} from '@/types'
import { SAFE_VERSION, TX_SERVICE_BY_CHAIN, type ProposeTransactionParams } from '@/types/safe'
import { transformToSafeMultisigResponse } from '@/utils/safe'
import { getInjectedProvider, randomSaltNonce } from '@/utils/safe'
import { safeKeys } from './safe.queries'
import { useSafeSDK } from '@/composables/safe/useSafeSdk'

interface DeploySafeParams {
  owners: string[]
  threshold: number
}

export interface ApproveTransactionParams {
  safeAddress: string
  safeTxHash: string
}

interface ExecuteSafeTransactionParams {
  safeAddress: string
  safeTxHash: string
  transactionData: SafeTransaction
}

export interface UpdateSafeOwnersParams {
  pathParams: {
    safeAddress: string
  }
  queryParams: {
    chainId: number
  }
  body: {
    ownersToAdd?: string[]
    ownersToRemove?: string[]
    newThreshold?: number
    shouldPropose?: boolean
    safeTxHash?: string
    signature?: SafeSignature | string
  }
}

function getTxServiceUrl(chainId: number): string {
  const txService = TX_SERVICE_BY_CHAIN[chainId]
  if (!txService) {
    throw new Error(`Transaction service not configured for chain ${chainId}`)
  }

  return txService.url
}

async function postTransactionProposal(params: ProposeTransactionParams): Promise<void> {
  const { chainId, safeAddress, safeTxHash, transactionData, sender, signature, origin } = params
  const txServiceUrl = getTxServiceUrl(chainId)

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
}

function assertWalletConnected(connection: ReturnType<typeof useConnection>): string {
  if (!connection.isConnected.value || !connection.address.value) {
    throw new Error('Wallet not connected')
  }

  return connection.address.value
}

export function useDeploySafeMutation() {
  const queryClient = useQueryClient()
  const connection = useConnection()

  return useMutation<string, Error, DeploySafeParams>({
    mutationFn: async ({ owners, threshold }) => {
      const signer = assertWalletConnected(connection)

      if (!owners.length) {
        throw new Error('At least one owner required')
      }

      if (threshold < 1 || threshold > owners.length) {
        throw new Error(`Threshold must be between 1 and ${owners.length}`)
      }

      owners.forEach((owner, index) => {
        if (!isAddress(owner)) {
          throw new Error(`Invalid owner address [${index}]: ${owner}`)
        }
      })

      const provider = getInjectedProvider()
      const safeAccountConfig: SafeAccountConfig = {
        owners,
        threshold
      }

      const safeSdk = await Safe.init({
        provider,
        signer,
        predictedSafe: {
          safeAccountConfig,
          safeDeploymentConfig: {
            saltNonce: randomSaltNonce(),
            safeVersion: SAFE_VERSION
          }
        }
      })

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

export function useApproveTransactionMutation() {
  const chainId = useChainId()
  const connection = useConnection()
  const queryClient = useQueryClient()
  const { loadSafe } = useSafeSDK()

  return useMutation<string, Error, ApproveTransactionParams>({
    mutationFn: async ({ safeAddress, safeTxHash }) => {
      const signer = assertWalletConnected(connection)

      if (!isAddress(safeAddress)) {
        throw new Error('Invalid Safe address')
      }

      if (!safeTxHash) {
        throw new Error('Missing Safe transaction hash')
      }

      const safeSdk = await loadSafe(safeAddress)
      const signature = await safeSdk.signHash(safeTxHash)
      const txServiceUrl = getTxServiceUrl(chainId.value)

      await externalApiClient.post(
        `${txServiceUrl}/api/v1/multisig-transactions/${safeTxHash}/confirmations/`,
        {
          signature: signature.data
        }
      )

      // keep signer usage explicit for typed payload parity with previous flow
      const _signedBy: SafeSignature = {
        data: signature.data,
        signer
      }

      return _signedBy.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: safeKeys.transactions(variables.safeAddress)
      })
    }
  })
}

export function useProposeTransactionMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, ProposeTransactionParams>({
    mutationFn: postTransactionProposal,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: safeKeys.transactions(variables.safeAddress)
      })
    }
  })
}

export function useExecuteTransactionMutation() {
  const connection = useConnection()
  const queryClient = useQueryClient()
  const { loadSafe } = useSafeSDK()

  return useMutation<string, Error, ExecuteSafeTransactionParams>({
    mutationFn: async ({ safeAddress, safeTxHash, transactionData }) => {
      assertWalletConnected(connection)

      if (!isAddress(safeAddress)) {
        throw new Error('Invalid Safe address')
      }

      if (!safeTxHash) {
        throw new Error('Missing Safe transaction hash')
      }

      const safeSdk = await loadSafe(safeAddress)

      const sdkTransactionData: SafeMultisigTransactionResponse =
        transformToSafeMultisigResponse(transactionData)
      const txResponse = await safeSdk.executeTransaction(sdkTransactionData)
      const txHash =
        (txResponse.transactionResponse as { hash?: string } | undefined)?.hash || txResponse.hash

      const waitFn = (
        txResponse.transactionResponse as { wait?: () => Promise<unknown> } | undefined
      )?.wait

      if (typeof waitFn === 'function') {
        await waitFn()
      }

      return txHash
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: safeKeys.info(variables.safeAddress)
      })
      queryClient.invalidateQueries({
        queryKey: safeKeys.transactions(variables.safeAddress)
      })
    }
  })
}

export function useUpdateSafeOwnersMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, UpdateSafeOwnersParams>({
    mutationFn: async () => undefined,
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

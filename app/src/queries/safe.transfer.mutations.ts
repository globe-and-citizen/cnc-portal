import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useChainId, useConnection } from '@wagmi/vue'
import { encodeFunctionData, erc20Abi, isAddress, parseEther, parseUnits, type Address } from 'viem'

import externalApiClient from '@/lib/external.axios.ts'
import type { ProposeTransactionBody, SafeTransferOptions } from '@/types'
import { TX_SERVICE_BY_CHAIN } from '@/types/safe'
import { getTokenAddress } from '@/utils'
import { safeKeys } from './safe.queries'
import { useSafeSDK } from '@/composables/safe/useSafeSdk'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

interface TransferFromSafeParams {
  safeAddress: string
  options: SafeTransferOptions
}

function getTxServiceUrl(chainId: number): string {
  const txService = TX_SERVICE_BY_CHAIN[chainId]
  if (!txService) {
    throw new Error(`Transaction service not configured for chain ${chainId}`)
  }

  return txService.url
}

function assertWalletConnected(connection: ReturnType<typeof useConnection>): string {
  if (!connection.isConnected.value || !connection.address.value) {
    throw new Error('Wallet not connected')
  }

  return connection.address.value
}

async function postTransactionProposal(params: {
  chainId: number
  safeAddress: string
  safeTxHash: string
  transactionData: {
    to: string
    value: string
    data: string
    operation: number
    safeTxGas: string
    baseGas: string
    gasPrice: string
    gasToken: string
    refundReceiver: string
    nonce: number
  }
  sender: string
  signature: string
  origin?: string
}) {
  const txServiceUrl = getTxServiceUrl(params.chainId)
  const body: ProposeTransactionBody = {
    ...params.transactionData,
    contractTransactionHash: params.safeTxHash,
    sender: params.sender,
    signature: params.signature,
    origin: params.origin || null
  }

  await externalApiClient.post(
    `${txServiceUrl}/api/v1/safes/${params.safeAddress}/multisig-transactions/`,
    body
  )
}

export function useTransferFromSafeMutation() {
  const chainId = useChainId()
  const connection = useConnection()
  const queryClient = useQueryClient()
  const { loadSafe } = useSafeSDK()

  return useMutation<string, Error, TransferFromSafeParams>({
    mutationFn: async ({ safeAddress, options }) => {
      const signer = assertWalletConnected(connection)

      if (!isAddress(safeAddress)) {
        throw new Error('Invalid Safe address')
      }

      if (!isAddress(options.to)) {
        throw new Error('Invalid recipient address')
      }

      if (!options.amount || parseFloat(options.amount) <= 0) {
        throw new Error('Invalid transfer amount')
      }

      const { to, amount, tokenId = 'native' } = options
      const tokenAddress = getTokenAddress(tokenId)
      const safeSdk = await loadSafe(safeAddress)
      const threshold = await safeSdk.getThreshold()
      const shouldPropose = threshold >= 2

      const transactionData = tokenAddress
        ? {
            to: tokenAddress,
            value: '0',
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: 'transfer',
              args: [
                to as Address,
                tokenId === 'usdc' || tokenId === 'usdt' || tokenId === 'usdc.e'
                  ? parseUnits(amount, 6)
                  : parseEther(amount)
              ]
            }),
            operation: 0
          }
        : {
            to,
            value: parseEther(amount).toString(),
            data: '0x',
            operation: 0
          }

      if (shouldPropose) {
        const safeTransaction = await safeSdk.createTransaction({
          transactions: [transactionData]
        })
        const safeTxHash = await safeSdk.getTransactionHash(safeTransaction)
        const signature = await safeSdk.signHash(safeTxHash)

        await postTransactionProposal({
          chainId: chainId.value,
          safeAddress,
          safeTxHash,
          transactionData: {
            to: transactionData.to,
            value: transactionData.value,
            data: transactionData.data,
            operation: transactionData.operation,
            safeTxGas: '0',
            baseGas: '0',
            gasPrice: '0',
            gasToken: ZERO_ADDRESS,
            refundReceiver: ZERO_ADDRESS,
            nonce: await safeSdk.getNonce()
          },
          sender: signer,
          signature: signature.data,
          origin: window.location.origin
        })

        return safeTxHash
      }

      const safeTransaction = await safeSdk.createTransaction({
        transactions: [transactionData]
      })
      const txResponse = await safeSdk.executeTransaction(safeTransaction)
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
      const safeAddress = variables.safeAddress

      queryClient.invalidateQueries({ queryKey: safeKeys.info(safeAddress) })
      queryClient.invalidateQueries({ queryKey: safeKeys.transactions(safeAddress) })
      queryClient.invalidateQueries({
        queryKey: ['balance', { address: safeAddress, chainId: chainId.value }]
      })
      queryClient.invalidateQueries({ queryKey: ['readContract'] })
    }
  })
}

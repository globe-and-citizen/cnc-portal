import { ref } from 'vue'
import { useConnection, useChainId } from '@wagmi/vue'

import { erc20Abi, isAddress, parseEther, parseUnits, encodeFunctionData, type Address } from 'viem'
import { useExecuteTransactionMutation } from '@/queries/safe.mutations'
import { useSafeSDK } from './useSafeSdk'
import { useSafeProposal } from './useSafeProposal'

import { getTokenAddress } from '@/utils'
import { type SafeTransferOptions } from '@/types'

/**
 * Transfer tokens or ETH from Safe
 */
export function useSafeTransfer() {
  const connection = useConnection()
  const chainId = useChainId()
  const toast = useToast()
  const executeMutation = useExecuteTransactionMutation()
  const { loadSafe } = useSafeSDK()
  const { proposeTransaction } = useSafeProposal()

  const isTransferring = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Transfer tokens or native currency from Safe
   */
  const transferFromSafe = async (
    safeAddress: string,
    options: SafeTransferOptions
  ): Promise<string | null> => {
    if (!isAddress(safeAddress)) {
      error.value = new Error('Invalid Safe address')
      toast.add({
        title: 'Error',
        description: 'Invalid Safe address',
        color: 'error'
      })
      return null
    }

    if (!isAddress(options.to)) {
      error.value = new Error('Invalid recipient address')
      toast.add({
        title: 'Error',
        description: 'Invalid recipient address',
        color: 'error'
      })
      return null
    }

    if (!options.amount || parseFloat(options.amount) <= 0) {
      error.value = new Error('Invalid transfer amount')
      toast.add({
        title: 'Error',
        description: 'Invalid transfer amount',
        color: 'error'
      })
      return null
    }

    if (!connection.isConnected.value || !connection.address.value) {
      error.value = new Error('Wallet not connected')
      toast.add({
        title: 'Error',
        description: 'Please connect your wallet',
        color: 'error'
      })
      return null
    }

    const { to, amount, tokenId = 'native' } = options
    const tokenAddress = getTokenAddress(tokenId)

    isTransferring.value = true
    error.value = null

    try {
      // Initialize Safe SDK
      const safeSdk = await loadSafe(safeAddress)

      // Determine if we should propose based on threshold
      const threshold = await safeSdk.getThreshold()
      const shouldPropose = threshold >= 2

      let transactionData: {
        to: string
        value: string
        data: string
        operation: number
      }

      if (tokenAddress) {
        console.log('Transferring ERC20 token from Safe token address', tokenAddress)
        // ERC20 token transfer
        if (!isAddress(tokenAddress)) {
          throw new Error('Invalid token address')
        }

        // Use proper decimals based on token type
        const parsedAmount =
          tokenId === 'usdc' || tokenId === 'usdt' || tokenId === 'usdc.e'
            ? parseUnits(amount, 6) // USDC/USDT have 6 decimals
            : parseEther(amount) // Default to 18 decimals

        const transferData = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [to as Address, parsedAmount]
        })

        transactionData = {
          to: tokenAddress,
          value: '0',
          data: transferData,
          operation: 0
        }
      } else {
        // Native ETH/POL transfer
        const parsedValue = parseEther(amount)

        transactionData = {
          to,
          value: parsedValue.toString(),
          data: '0x',
          operation: 0
        }
      }

      if (shouldPropose) {
        const safeTxHash = await proposeTransaction(safeAddress, transactionData)

        if (!safeTxHash) {
          throw new Error('Failed to propose transaction')
        }

        toast.add({
          title: 'Success',
          description: `Transfer proposed successfully${tokenAddress ? ' (Token)' : ' (Native)'}`,
          color: 'success'
        })
        return safeTxHash
      } else {
        // Execute directly (threshold = 1)
        const safeTransaction = await safeSdk.createTransaction({
          transactions: [transactionData]
        })

        const txResponse = await safeSdk.executeTransaction(safeTransaction)
        const txHash =
          (txResponse.transactionResponse as { hash?: string } | undefined)?.hash || txResponse.hash

        // Wait for confirmation (if available)
        const waitFn = (
          txResponse.transactionResponse as { wait?: () => Promise<unknown> } | undefined
        )?.wait

        if (typeof waitFn === 'function') {
          await waitFn()
        }

        // Trigger query invalidation via mutation
        await executeMutation.mutateAsync({
          pathParams: {
            safeAddress,
            safeTxHash: await safeSdk.getTransactionHash(safeTransaction)
          },
          queryParams: {
            chainId: chainId.value
          },
          body: {
            txHash
          }
        })

        toast.add({
          title: 'Success',
          description: `Transfer executed successfully${tokenAddress ? ' (Token)' : ' (Native)'}`,
          color: 'success'
        })
        return txHash
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to transfer from Safe')
      console.error('Safe transfer error:', err)

      toast.add({
        title: 'Error',
        description: error.value.message.includes('User rejected')
          ? 'Transaction approval rejected'
          : error.value.message,
        color: 'error'
      })
      return null
    } finally {
      isTransferring.value = false
    }
  }

  return {
    transferFromSafe,
    isTransferring,
    error
  }
}

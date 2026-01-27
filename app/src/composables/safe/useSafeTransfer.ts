import { ref } from 'vue'
import { useConnection, useChainId } from '@wagmi/vue'
import { isAddress, parseEther, encodeFunctionData, type Address } from 'viem'
import { useToastStore } from '@/stores'
import { useExecuteTransactionMutation } from '@/queries/safe.queries'
import { useSafeSDK } from './useSafeSdk'
import { useSafeProposal } from './useSafeProposal'
import { erc20Abi } from 'viem'

export interface SafeTransferOptions {
  to: string
  amount: string
  tokenAddress?: string // If undefined, transfer native ETH/POL
}

/**
 * Transfer tokens or ETH from Safe
 */
export function useSafeTransfer() {
  const connection = useConnection()
  const chainId = useChainId()
  const { addSuccessToast, addErrorToast } = useToastStore()
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
      addErrorToast('Invalid Safe address')
      return null
    }

    if (!isAddress(options.to)) {
      error.value = new Error('Invalid recipient address')
      addErrorToast('Invalid recipient address')
      return null
    }

    if (!options.amount || parseFloat(options.amount) <= 0) {
      error.value = new Error('Invalid transfer amount')
      addErrorToast('Invalid transfer amount')
      return null
    }

    if (!connection.isConnected.value || !connection.address.value) {
      error.value = new Error('Wallet not connected')
      addErrorToast('Please connect your wallet')
      return null
    }

    const { to, amount, tokenAddress } = options

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
        // ERC20 token transfer
        if (!isAddress(tokenAddress)) {
          throw new Error('Invalid token address')
        }

        const parsedAmount = parseEther(amount)

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
        //  ONLY use proposeTransaction - this handles everything
        const safeTxHash = await proposeTransaction(safeAddress, transactionData)

        if (!safeTxHash) {
          throw new Error('Failed to propose transaction')
        }

        addSuccessToast(`Transfer proposed successfully${tokenAddress ? ' (Token)' : ' (Native)'}`)
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
          chainId: chainId.value,
          safeAddress,
          safeTxHash: await safeSdk.getTransactionHash(safeTransaction),
          txHash
        })

        addSuccessToast(`Transfer executed successfully${tokenAddress ? ' (Token)' : ' (Native)'}`)
        return txHash
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to transfer from Safe')
      console.error('Safe transfer error:', err)
      addErrorToast(
        error.value.message.includes('User rejected')
          ? 'Transaction approval rejected'
          : error.value.message
      )
      return null
    } finally {
      isTransferring.value = false
    }
  }

  /**
   * Transfer native currency (ETH/POL) from Safe
   */
  const transferNative = async (
    safeAddress: string,
    to: string,
    amount: string
  ): Promise<string | null> => {
    return transferFromSafe(safeAddress, {
      to,
      amount
    })
  }

  /**
   * Transfer ERC20 tokens from Safe
   */
  const transferToken = async (
    safeAddress: string,
    to: string,
    amount: string,
    tokenAddress: string
  ): Promise<string | null> => {
    return transferFromSafe(safeAddress, {
      to,
      amount,
      tokenAddress
    })
  }

  return {
    transferFromSafe,
    transferNative,
    transferToken,
    isTransferring,
    error
  }
}

import { ref, watch } from 'vue'
import { config } from '@/wagmi.config'
import { useWaitForTransactionReceipt } from '@wagmi/vue'
import { getWalletClient, readContract } from '@wagmi/core'
import { parseUnits, formatUnits } from 'viem/utils'

import type { Abi } from 'viem'

export function useDeployContract(contractAbi: Abi, contractByteCode: `0x${string}`) {
  const hash = ref<`0x${string}` | undefined>()
  const contractAddress = ref<string | null>(null)
  const error = ref<Error | null>(null)
  const isDeploying = ref(false)

  // Watch for transaction confirmation
  const { data: receipt, isSuccess, isLoading } = useWaitForTransactionReceipt({ hash })

  watch(isLoading, (isConfirming, wasConfirming) => {
    if (!isConfirming && wasConfirming && isSuccess.value && receipt.value?.contractAddress) {
      contractAddress.value = receipt.value.contractAddress
      isDeploying.value = false
    }
  })

  const deploy = async (bankAddress: string, costPerClick: string, costPerImpression: string) => {
    isDeploying.value = true
    error.value = null
    contractAddress.value = null

    try {
      const walletClient = await getWalletClient(config)
      if (!walletClient) throw new Error('Wallet not connected')

      const click = parseUnits(String(costPerClick), 18)
      const impression = parseUnits(String(costPerImpression), 18)

      const txHash = await walletClient.deployContract({
        abi: contractAbi,
        bytecode: contractByteCode,
        args: [click, impression, bankAddress],
        account: walletClient.account.address
      })

      hash.value = txHash
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err
      } else {
        error.value = new Error('An unknown error occurred')
      }
      isDeploying.value = false
    }
  }

  return {
    deploy,
    isDeploying,
    contractAddress,
    error
  }
}

export async function getContractData(
  address: string,
  contractAbi: Abi
): Promise<{ key: string; value: string }[]> {
  const result: { key: string; value: string }[] = []

  for (const fn of contractAbi) {
    if (
      fn.type === 'function' &&
      typeof fn.name === 'string' &&
      ['view', 'pure'].includes(fn.stateMutability || '') &&
      fn.inputs?.length === 0
    ) {
      try {
        const rawValue = (await readContract(config, {
          address: address as `0x${string}`,
          abi: contractAbi,
          functionName: fn.name
        })) as bigint | string

        result.push({
          key: fn.name,
          value:
            typeof rawValue === 'bigint' ? formatUnits(rawValue, 18) : (rawValue?.toString() ?? '')
        })
      } catch (err) {
        console.error(`Error calling ${fn.name}:`, err)
      }
    }
  }

  return result
}

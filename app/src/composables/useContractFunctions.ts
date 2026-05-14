import { ref } from 'vue'
import { config } from '@/wagmi.config'
import { getWalletClient, readContract, waitForTransactionReceipt } from '@wagmi/core'
import { parseUnits, formatUnits } from 'viem/utils'

import type { Abi, Address } from 'viem'

export function useDeployContract(contractAbi: Abi, contractByteCode: `0x${string}`) {
  const contractAddress = ref<string | null>(null)
  const error = ref<Error | null>(null)
  const isDeploying = ref(false)

  const deploy = async (bankAddress: Address, costPerClick: string, costPerImpression: string) => {
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

      const receipt = await waitForTransactionReceipt(config, { hash: txHash })
      if (receipt.contractAddress) {
        contractAddress.value = receipt.contractAddress
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err : new Error('An unknown error occurred')
    } finally {
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
  address: Address,
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
          address: address,
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

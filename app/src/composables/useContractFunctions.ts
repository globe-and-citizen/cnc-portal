import { config } from '@/wagmi.config'
import { getWalletClient, readContract, waitForTransactionReceipt } from '@wagmi/core'
import { parseUnits, formatUnits } from 'viem/utils'
import { useMutation } from '@tanstack/vue-query'

import type { Abi, Address } from 'viem'

export interface DeployContractArgs {
  bankAddress: Address
  costPerClick: string
  costPerImpression: string
}

/**
 * Deploy a campaign contract: builds the constructor args, sends the deploy
 * transaction, waits for the receipt, and returns the new contract address.
 * Throws when the wallet is missing or the receipt has no contract address.
 */
export async function deployContract(
  contractAbi: Abi,
  contractByteCode: `0x${string}`,
  { bankAddress, costPerClick, costPerImpression }: DeployContractArgs
): Promise<Address> {
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
  if (!receipt.contractAddress) {
    throw new Error('Deployment confirmed but no contract address was returned')
  }
  return receipt.contractAddress
}

/**
 * Side effects:
 *   - onSuccess: none — the caller owns the business-flow toast + invalidation
 *                ("deploy + register contract" is one logical outcome).
 *   - onError:   no toast (caller renders mutation.error via UAlert).
 */
export function useDeployContract(contractAbi: Abi, contractByteCode: `0x${string}`) {
  return useMutation({
    mutationFn: (args: DeployContractArgs) => deployContract(contractAbi, contractByteCode, args)
  })
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

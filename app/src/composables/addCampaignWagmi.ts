import { ref, watch } from 'vue'
import { config } from '@/wagmi.config'
import { useWaitForTransactionReceipt } from '@wagmi/vue'
import { getWalletClient } from '@wagmi/core'
import { parseUnits } from 'viem/utils'
import type { Abi } from 'viem'
import ADD_CAMPAIGN_ARTIFACT from '@/artifacts/abi/AdCampaignManager.json'

export function useDeployAdCampaignManager() {
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
        abi: ADD_CAMPAIGN_ARTIFACT.abi as Abi,
        bytecode: ADD_CAMPAIGN_ARTIFACT.bytecode as `0x${string}`,
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

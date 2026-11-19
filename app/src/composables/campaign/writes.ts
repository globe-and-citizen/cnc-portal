import type { Address } from 'viem'
import { type MaybeRef } from 'vue'
import { adCampaignManagerAbi } from '@/artifacts/abi/generated'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useQueryClient } from '@tanstack/vue-query'

function useCampaignWriteInvalidation() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['campaign'] })
}

export function useCreateAdvertisingCampaign(contractAddress: MaybeRef<Address | undefined>) {
  return useContractWritesV3({
    contractAddress,
    abi: adCampaignManagerAbi,
    functionName: 'createAdCampaign',
    onSuccess: useCampaignWriteInvalidation()
  })
}

export function useWithdrawAdvertisingCampaign(contractAddress: MaybeRef<Address | undefined>) {
  return useContractWritesV3({
    contractAddress,
    abi: adCampaignManagerAbi,
    functionName: 'requestAndApproveWithdrawal',
    onSuccess: useCampaignWriteInvalidation()
  })
}

export function useSetCampaignCostPerClick(contractAddress: MaybeRef<Address | undefined>) {
  return useContractWritesV3({
    contractAddress,
    abi: adCampaignManagerAbi,
    functionName: 'setCostPerClick'
  })
}

export function useSetCampaignCostPerImpression(contractAddress: MaybeRef<Address | undefined>) {
  return useContractWritesV3({
    contractAddress,
    abi: adCampaignManagerAbi,
    functionName: 'setCostPerImpression'
  })
}

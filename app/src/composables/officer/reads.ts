import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useTeamStore } from '@/stores'
import { officerAbi } from '@/artifacts/abi/generated'
export function useOfficerAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.currentTeamMeta.data?.currentOfficer?.address)
}

export function useOfficerFeeBps(contractType: string) {
  const officerAddress = useOfficerAddress()

  return useReadContract({
    address: officerAddress,
    abi: officerAbi,
    functionName: 'getFeeFor',
    args: [contractType],
    query: {
      enabled: computed(() => !!officerAddress.value && isAddress(officerAddress.value))
    }
  })
}

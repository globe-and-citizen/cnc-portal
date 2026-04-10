import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useTeamStore } from '@/stores'
import { OFFICER_ABI } from '@/artifacts/abi/officer'

export function useOfficerAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.currentTeamMeta.data?.officerAddress)
}

export function useOfficerFeeBps(contractType: string) {
  const officerAddress = useOfficerAddress()

  return useReadContract({
    address: officerAddress,
    abi: OFFICER_ABI,
    functionName: 'getFeeFor',
    args: [contractType],
    query: {
      enabled: computed(() => !!officerAddress.value && isAddress(officerAddress.value))
    }
  })
}

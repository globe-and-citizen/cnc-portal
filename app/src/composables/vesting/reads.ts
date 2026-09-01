import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { vestingAbi } from '@/artifacts/abi/generated'
import { useTeamStore } from '@/stores'

export function useVestingAddress() {
  const teamStore = useTeamStore()
  return computed<Address | undefined>(() => {
    const address = teamStore.getContractAddressByType('Vesting')
    return address && isAddress(address) ? address : undefined
  })
}

export function useVestingGetVestingsWithMembers() {
  const vestingAddress = useVestingAddress()

  return useReadContract({
    address: vestingAddress,
    abi: vestingAbi,
    functionName: 'getVestingsWithMembers',
    query: {
      enabled: computed(() => !!vestingAddress.value)
    }
  })
}

export function useVestingGetAllArchivedVestingsFlat() {
  const vestingAddress = useVestingAddress()

  return useReadContract({
    address: vestingAddress,
    abi: vestingAbi,
    functionName: 'getAllArchivedVestingsFlat',
    query: {
      enabled: computed(() => !!vestingAddress.value)
    }
  })
}

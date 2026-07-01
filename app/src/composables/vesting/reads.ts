import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { VESTING_ABI } from '@/artifacts/abi/vesting'
import { useTeamStore } from '@/stores'

export const VESTING_FUNCTION_NAMES = {
  GET_VESTINGS_WITH_MEMBERS: 'getVestingsWithMembers',
  GET_ALL_ARCHIVED_VESTINGS_FLAT: 'getAllArchivedVestingsFlat',
  GET_MEMBERS: 'getMembers',
  RELEASABLE: 'releasable',
  VESTED_AMOUNT: 'vestedAmount'
} as const

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
    abi: VESTING_ABI,
    functionName: VESTING_FUNCTION_NAMES.GET_VESTINGS_WITH_MEMBERS,
    query: {
      enabled: computed(() => !!vestingAddress.value)
    }
  })
}

export function useVestingGetAllArchivedVestingsFlat() {
  const vestingAddress = useVestingAddress()

  return useReadContract({
    address: vestingAddress,
    abi: VESTING_ABI,
    functionName: VESTING_FUNCTION_NAMES.GET_ALL_ARCHIVED_VESTINGS_FLAT,
    query: {
      enabled: computed(() => !!vestingAddress.value)
    }
  })
}

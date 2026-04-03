import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress } from 'viem'
import { VESTING_ABI } from '@/artifacts/abi/vesting'
import { VESTING_ADDRESS } from '@/constant'
import { useTeamStore } from '@/stores'

export const VESTING_FUNCTION_NAMES = {
  GET_TEAM_VESTINGS_WITH_MEMBERS: 'getTeamVestingsWithMembers',
  GET_TEAM_ALL_ARCHIVED_VESTINGS_FLAT: 'getTeamAllArchivedVestingsFlat',
  GET_TEAM_MEMBERS: 'getTeamMembers',
  GET_USER_TEAMS: 'getUserTeams',
  RELEASABLE: 'releasable',
  VESTED_AMOUNT: 'vestedAmount'
} as const

export function useVestingAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('VestingV1') ?? VESTING_ADDRESS)
}

export function useVestingGetTeamVestingsWithMembers(teamId: MaybeRef<bigint>) {
  const vestingAddress = useVestingAddress()
  const teamIdValue = computed(() => unref(teamId))

  return useReadContract({
    address: vestingAddress,
    abi: VESTING_ABI,
    functionName: VESTING_FUNCTION_NAMES.GET_TEAM_VESTINGS_WITH_MEMBERS,
    args: [teamIdValue],
    query: {
      enabled: computed(() => !!vestingAddress.value && isAddress(vestingAddress.value))
    }
  })
}

export function useVestingGetTeamAllArchivedVestingsFlat(teamId: MaybeRef<bigint>) {
  const vestingAddress = useVestingAddress()
  const teamIdValue = computed(() => unref(teamId))

  return useReadContract({
    address: vestingAddress,
    abi: VESTING_ABI,
    functionName: VESTING_FUNCTION_NAMES.GET_TEAM_ALL_ARCHIVED_VESTINGS_FLAT,
    args: [teamIdValue],
    query: {
      enabled: computed(() => !!vestingAddress.value && isAddress(vestingAddress.value))
    }
  })
}

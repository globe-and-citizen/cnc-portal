import { useQueryClient } from '@tanstack/vue-query'
import { vestingAbi } from '@/artifacts/abi/generated'
import {
  useContractWritesV3,
  type WriteFunctionName
} from '@/composables/contracts/useContractWritesV3'
import { useVestingAddress } from './reads'
import { useTeamStore } from '@/stores'

type VestingFunctionNames = WriteFunctionName<typeof vestingAbi>

function useVestingContractWrite<F extends VestingFunctionNames>(
  functionName: F,
  onSuccess?: () => Promise<void>
) {
  const vestingAddress = useVestingAddress()
  return useContractWritesV3({
    contractAddress: vestingAddress,
    abi: vestingAbi,
    functionName,
    onSuccess
  })
}

function useVestingShareMintWrite<F extends VestingFunctionNames>(functionName: F) {
  const queryClient = useQueryClient()
  const teamStore = useTeamStore()

  return useVestingContractWrite(functionName, async () => {
    const investorAddress = teamStore.getInvestorAddress()
    if (!investorAddress) return
    const normalizedAddress = investorAddress.toLowerCase()

    await queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey
        if (!Array.isArray(key) || key[0] !== 'readContract') return false
        const params = key[1] as { address?: string } | undefined
        return params?.address?.toLowerCase() === normalizedAddress
      }
    })
  })
}

export function useVestingAddVestingWrite() {
  return useVestingContractWrite('addVesting')
}

export function useVestingStopVestingWrite() {
  return useVestingShareMintWrite('stopVesting')
}

export function useVestingReleaseWrite() {
  return useVestingShareMintWrite('release')
}

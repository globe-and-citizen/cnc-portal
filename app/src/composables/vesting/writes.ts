import { computed } from 'vue'
import type { ExtractAbiFunctionNames } from 'abitype'
import { vestingAbi } from '@/artifacts/abi/generated'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useVestingAddress } from './reads'

type VestingFunctionNames = ExtractAbiFunctionNames<typeof vestingAbi>

function useVestingContractWrite(functionName: VestingFunctionNames) {
  const vestingAddress = useVestingAddress()
  return useContractWritesV3({
    contractAddress: computed(() => vestingAddress.value ?? undefined),
    abi: vestingAbi,
    functionName
  })
}

export function useVestingAddVestingWrite() {
  return useVestingContractWrite('addVesting')
}

export function useVestingStopVestingWrite() {
  return useVestingContractWrite('stopVesting')
}

export function useVestingReleaseWrite() {
  return useVestingContractWrite('release')
}

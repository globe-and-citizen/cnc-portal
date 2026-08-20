import { computed } from 'vue'
import { vestingAbi } from '@/artifacts/abi/generated'
import {
  useContractWritesV3,
  type WriteFunctionName
} from '@/composables/contracts/useContractWritesV3'
import { useVestingAddress } from './reads'

type VestingFunctionNames = WriteFunctionName<typeof vestingAbi>

function useVestingContractWrite<F extends VestingFunctionNames>(functionName: F) {
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

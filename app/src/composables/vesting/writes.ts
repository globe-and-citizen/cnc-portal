import { computed, type MaybeRef } from 'vue'
import type { ExtractAbiFunctionNames } from 'abitype'
import { VESTING_ABI } from '@/artifacts/abi/vesting'
import { useContractWrites } from '@/composables/contracts/useContractWritesV2'
import { useVestingAddress } from './reads'

type VestingFunctionNames = ExtractAbiFunctionNames<typeof VESTING_ABI>

export function useVestingContractWrite(options: {
  functionName: VestingFunctionNames
  args?: MaybeRef<readonly unknown[]>
  value?: MaybeRef<bigint>
}) {
  const vestingAddress = useVestingAddress()

  return useContractWrites({
    contractAddress: computed(() => vestingAddress.value ?? undefined),
    abi: VESTING_ABI,
    functionName: options.functionName,
    args: options.args ?? [],
    ...(options.value !== undefined ? { value: options.value } : {})
  })
}

export function useVestingAddVestingWrite() {
  return useVestingContractWrite({
    functionName: 'addVesting',
    args: []
  })
}

export function useVestingStopVestingWrite() {
  return useVestingContractWrite({
    functionName: 'stopVesting',
    args: []
  })
}

export function useVestingReleaseWrite() {
  return useVestingContractWrite({
    functionName: 'release',
    args: []
  })
}

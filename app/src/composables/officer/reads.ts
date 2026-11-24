import { type Address, isAddress, zeroAddress } from 'viem'
import { type MaybeRefOrGetter, computed, toValue } from 'vue'
import { officerAbi } from '@/artifacts/abi/generated'
import { useReadContract } from '@wagmi/vue'
import { useTeamStore } from '@/stores'
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

/** Whether the FeeCollector charges fees on `tokenAddress`; never queried for the native token. */
export function useOfficerIsFeeCollectorToken(tokenAddress: MaybeRefOrGetter<Address | undefined>) {
  const officerAddress = useOfficerAddress()
  const token = computed(() => toValue(tokenAddress))

  return useReadContract({
    address: officerAddress,
    abi: officerAbi,
    functionName: 'isFeeCollectorToken',
    args: computed(() => [token.value ?? zeroAddress] as const),
    query: {
      enabled: computed(
        () =>
          !!officerAddress.value &&
          isAddress(officerAddress.value) &&
          !!token.value &&
          token.value !== zeroAddress
      )
    }
  })
}

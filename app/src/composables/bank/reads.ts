import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useTeamStore } from '@/stores'
import { bankAbi } from '@/artifacts/abi/generated'
/**
 * Bank contract address helper
 */
export function useBankAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('Bank'))
}

export function useBankOwner() {
  const bankAddress = useBankAddress()
  return useReadContract({
    address: bankAddress,
    abi: bankAbi,
    functionName: 'owner',
    query: {
      enabled: computed(() => !!bankAddress.value && isAddress(bankAddress.value))
    }
  })
}

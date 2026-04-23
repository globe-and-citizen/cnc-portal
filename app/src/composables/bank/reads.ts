import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useTeamStore } from '@/stores'
import { BANK_ABI } from '@/artifacts/abi/bank'

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
    abi: BANK_ABI,
    functionName: 'owner',
    query: { enabled: !!bankAddress.value && isAddress(bankAddress.value) }
  })
}

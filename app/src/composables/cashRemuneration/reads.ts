import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useTeamStore } from '@/stores'
import { cashRemunerationEip712Abi } from '@/artifacts/abi/generated'
/**
 * CashRemunerationEIP712 contract address helper
 */
export function useCashRemunerationAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('CashRemunerationEIP712'))
}

export function useCashRemunerationOwner() {
  const contractAddress = useCashRemunerationAddress()

  return useReadContract({
    address: contractAddress,
    abi: cashRemunerationEip712Abi,
    functionName: 'owner',
    query: { enabled: !!contractAddress.value && isAddress(contractAddress.value) }
  })
}

import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useTeamStore } from '@/stores'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'

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
    abi: CASH_REMUNERATION_EIP712_ABI,
    functionName: 'owner',
    query: { enabled: !!contractAddress.value && isAddress(contractAddress.value) }
  })
}

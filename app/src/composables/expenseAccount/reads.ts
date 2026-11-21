import { computed } from 'vue'
import { expenseAccountEip712Abi } from '@/artifacts/abi/generated'
import { isAddress } from 'viem'
import { useReadContract } from '@wagmi/vue'
import { useTeamStore } from '@/stores'
/**
 * ExpenseAccountEIP712 contract address helper
 */
export function useExpenseAccountAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('ExpenseAccountEIP712'))
}

export function useExpenseAccountOwner() {
  const contractAddress = useExpenseAccountAddress()

  return useReadContract({
    address: contractAddress,
    abi: expenseAccountEip712Abi,
    functionName: 'owner',
    query: { enabled: !!contractAddress.value && isAddress(contractAddress.value) }
  })
}

export function useExpenseAccountSupportedTokens() {
  const contractAddress = useExpenseAccountAddress()

  return useReadContract({
    address: contractAddress,
    abi: expenseAccountEip712Abi,
    functionName: 'getSupportedTokens',
    query: { enabled: computed(() => !!contractAddress.value && isAddress(contractAddress.value)) }
  })
}

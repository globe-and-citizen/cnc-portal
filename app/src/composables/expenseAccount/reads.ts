import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useTeamStore } from '@/stores'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'

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
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'owner',
    query: { enabled: !!contractAddress.value && isAddress(contractAddress.value) }
  })
}

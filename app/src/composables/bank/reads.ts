import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useTeamStore } from '@/stores'
import { useContractAbi } from '@/composables/contracts/useContractAbi'

/**
 * Bank contract address helper
 */
export function useBankAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('Bank'))
}

export function useBankOwner() {
  const bankAddress = useBankAddress()
  const abi = useContractAbi('Bank')
  return useReadContract({
    address: bankAddress,
    abi,
    functionName: 'owner',
    query: { enabled: !!bankAddress.value && isAddress(bankAddress.value) }
  })
}

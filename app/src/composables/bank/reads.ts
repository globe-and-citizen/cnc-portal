import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useTeamStore } from '@/stores'
import { bankAbi } from '@/artifacts/abi/generated'
/**
 * Bank contract address helper
 */
export function useBankAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('Bank'))
}

/**
 * Owner of a Bank. Defaults to the team's current Bank; pass an address to read
 * the Bank of an archived Officer generation instead.
 */
export function useBankOwner(address?: MaybeRefOrGetter<Address | undefined>) {
  const currentBankAddress = useBankAddress()
  const bankAddress = computed(() => toValue(address) ?? currentBankAddress.value)
  return useReadContract({
    address: bankAddress,
    abi: bankAbi,
    functionName: 'owner',
    query: {
      enabled: computed(() => !!bankAddress.value && isAddress(bankAddress.value))
    }
  })
}

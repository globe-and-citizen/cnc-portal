import { type Address, isAddress } from 'viem'
import { type MaybeRefOrGetter, computed, toValue } from 'vue'
import { bankAbi } from '@/artifacts/abi/generated'
import { useReadContract } from '@wagmi/vue'
import { useTeamStore } from '@/stores'
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

/**
 * Whether a Bank is currently paused (`Pausable.paused()`). Defaults to the team's
 * current Bank; pass an address to read the Bank of an archived Officer generation instead.
 */
export function useBankPaused(address?: MaybeRefOrGetter<Address | undefined>) {
  const currentBankAddress = useBankAddress()
  const bankAddress = computed(() => toValue(address) ?? currentBankAddress.value)
  return useReadContract({
    address: bankAddress,
    abi: bankAbi,
    functionName: 'paused',
    query: {
      enabled: computed(() => !!bankAddress.value && isAddress(bankAddress.value))
    }
  })
}

import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useTeamStore } from '@/stores'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'

/**
 * InvestorV1 contract address helper
 */
export function useInvestorAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('InvestorV1'))
}

/**
 * InvestorV1 read composables
 */
export function useInvestorName() {
  const investorsAddress = useInvestorAddress()
  return useReadContract({
    address: investorsAddress,
    abi: INVESTOR_ABI,
    functionName: 'name' as const,
    query: { enabled: !!investorsAddress.value && isAddress(investorsAddress.value) }
  })
}

export function useInvestorSymbol() {
  const investorsAddress = useInvestorAddress()
  return useReadContract({
    address: investorsAddress,
    abi: INVESTOR_ABI,
    functionName: 'symbol' as const,
    query: { enabled: !!investorsAddress.value && isAddress(investorsAddress.value) }
  })
}

export function useInvestorTotalSupply() {
  const investorsAddress = useInvestorAddress()
  return useReadContract({
    address: investorsAddress,
    abi: INVESTOR_ABI,
    functionName: 'totalSupply' as const,
    query: { enabled: !!investorsAddress.value && isAddress(investorsAddress.value) }
  })
}

export function useInvestorPaused() {
  const investorsAddress = useInvestorAddress()
  return useReadContract({
    address: investorsAddress,
    abi: INVESTOR_ABI,
    functionName: 'paused' as const,
    query: { enabled: !!investorsAddress.value && isAddress(investorsAddress.value) }
  })
}

export function useInvestorOwner() {
  const investorsAddress = useInvestorAddress()
  return useReadContract({
    address: investorsAddress,
    abi: INVESTOR_ABI,
    functionName: 'owner' as const,
    query: { enabled: !!investorsAddress.value && isAddress(investorsAddress.value) }
  })
}

export function useInvestorBalanceOf(account: MaybeRef<Address>) {
  const investorsAddress = useInvestorAddress()
  const accountValue = computed(() => unref(account))
  return useReadContract({
    address: investorsAddress,
    abi: INVESTOR_ABI,
    functionName: 'balanceOf' as const,
    args: [accountValue],
    query: {
      enabled: computed(
        () =>
          !!investorsAddress.value &&
          isAddress(investorsAddress.value) &&
          isAddress(accountValue.value)
      )
    }
  })
}

export function useInvestorShareholders() {
  const investorsAddress = useInvestorAddress()
  return useReadContract({
    address: investorsAddress,
    abi: INVESTOR_ABI,
    functionName: 'getShareholders' as const,
    query: { enabled: !!investorsAddress.value && isAddress(investorsAddress.value) }
  })
}

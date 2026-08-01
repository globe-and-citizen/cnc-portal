import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useTeamStore } from '@/stores'
import { investorAbi } from '@/artifacts/abi/generated'
/**
 * Investor contract address helper
 */
export function useInvestorAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getInvestorAddress())
}

export function useInvestorName() {
  const investorsAddress = useInvestorAddress()
  return useReadContract({
    address: investorsAddress,
    abi: investorAbi,
    functionName: 'name' as const,
    query: {
      enabled: computed(() => !!investorsAddress.value && isAddress(investorsAddress.value))
    }
  })
}

export function useInvestorSymbol() {
  const investorsAddress = useInvestorAddress()
  return useReadContract({
    address: investorsAddress,
    abi: investorAbi,
    functionName: 'symbol' as const,
    query: {
      enabled: computed(() => !!investorsAddress.value && isAddress(investorsAddress.value))
    }
  })
}

export function useInvestorTotalSupply() {
  const investorsAddress = useInvestorAddress()
  return useReadContract({
    address: investorsAddress,
    abi: investorAbi,
    functionName: 'totalSupply' as const,
    query: {
      enabled: computed(() => !!investorsAddress.value && isAddress(investorsAddress.value))
    }
  })
}

export function useInvestorOwner() {
  const investorsAddress = useInvestorAddress()
  return useReadContract({
    address: investorsAddress,
    abi: investorAbi,
    functionName: 'owner' as const,
    query: {
      enabled: computed(() => !!investorsAddress.value && isAddress(investorsAddress.value))
    }
  })
}

export function useInvestorBalanceOf(account: MaybeRef<Address>) {
  const investorsAddress = useInvestorAddress()
  const accountValue = computed(() => unref(account))
  return useReadContract({
    address: investorsAddress,
    abi: investorAbi,
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
    abi: investorAbi,
    functionName: 'getShareholders' as const,
    query: {
      enabled: computed(() => !!investorsAddress.value && isAddress(investorsAddress.value))
    }
  })
}

export function useInvestorMigrationRoot() {
  const investorsAddress = useInvestorAddress()
  return useReadContract({
    address: investorsAddress,
    abi: investorAbi,
    functionName: 'getMigrationRoot' as const,
    query: {
      enabled: computed(() => !!investorsAddress.value && isAddress(investorsAddress.value))
    }
  })
}

export function useInvestorMigrationComplete() {
  const investorsAddress = useInvestorAddress()
  return useReadContract({
    address: investorsAddress,
    abi: investorAbi,
    functionName: 'isMigrationComplete' as const,
    query: {
      enabled: computed(() => !!investorsAddress.value && isAddress(investorsAddress.value))
    }
  })
}

// UNUSED — no consumers outside this file's own context.
/*
export function useInvestorPaused() {
  const investorsAddress = useInvestorAddress()
  return useReadContract({
    address: investorsAddress,
    abi: investorAbi,
    functionName: 'paused' as const,
    query: { enabled: !!investorsAddress.value && isAddress(investorsAddress.value) }
  })
}
*/

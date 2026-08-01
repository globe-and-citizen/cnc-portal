import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useTeamStore } from '@/stores'
import { investorAbi } from '@/artifacts/abi/generated'
/**
 * Investor (v2) contract address helper. Distinct from `InvestorV1` — a team
 * has at most one of the two TeamContract rows, never both (see #2286).
 */
export function useInvestorV2Address() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getInvestorAddress())
}

export function useInvestorV2MigrationRoot() {
  const investorAddress = useInvestorV2Address()
  return useReadContract({
    address: investorAddress,
    abi: investorAbi,
    functionName: 'getMigrationRoot' as const,
    query: { enabled: !!investorAddress.value && isAddress(investorAddress.value) }
  })
}

export function useInvestorV2MigrationComplete() {
  const investorAddress = useInvestorV2Address()
  return useReadContract({
    address: investorAddress,
    abi: investorAbi,
    functionName: 'isMigrationComplete' as const,
    query: { enabled: !!investorAddress.value && isAddress(investorAddress.value) }
  })
}

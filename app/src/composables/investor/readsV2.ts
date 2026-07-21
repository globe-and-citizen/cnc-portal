import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useTeamStore } from '@/stores'
import { INVESTOR_V2_ABI } from '@/artifacts/abi/investorV2'

/**
 * Investor (v2) contract address helper. Distinct from `InvestorV1` — a team
 * has at most one of the two TeamContract rows, never both (see #2286).
 */
export function useInvestorV2Address() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('Investor'))
}

export function useInvestorV2MigrationRoot() {
  const investorAddress = useInvestorV2Address()
  return useReadContract({
    address: investorAddress,
    abi: INVESTOR_V2_ABI,
    functionName: 'getMigrationRoot' as const,
    query: { enabled: !!investorAddress.value && isAddress(investorAddress.value) }
  })
}

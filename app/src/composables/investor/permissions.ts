import { getPublicClient } from '@wagmi/core'
import { useQuery } from '@tanstack/vue-query'
import { useReadContract } from '@wagmi/vue'
import { computed, toValue, unref, type MaybeRef, type MaybeRefOrGetter, type Ref } from 'vue'
import { isAddress, zeroAddress, type Address, type Hex } from 'viem'
import { investorAbi } from '@/artifacts/abi/generated'
import { currentChainId } from '@/constant'
import {
  fetchInvestorPermissions,
  type InvestorPermissionsResult
} from '@/queries/investorPermissions.queries'
import { useTeamStore } from '@/stores/teamStore'
import {
  getKnownInvestorPermissionAddresses,
  type InvestorPermissionOfficer
} from '@/utils/investors/permissions'
import { config } from '@/wagmi.config'

export const INVESTOR_PERMISSIONS_QUERY_KEY = 'investor-permissions'

export function useInvestorPermissions(
  officers: MaybeRefOrGetter<readonly InvestorPermissionOfficer[]> = []
) {
  const teamStore = useTeamStore()
  const investorAddress = computed(() => teamStore.getContractAddressByType('Investor'))
  const knownAccounts = computed<Address[]>(() => {
    const team = teamStore.currentTeamMeta.data
    const candidates = [
      team?.ownerAddress,
      ...getKnownInvestorPermissionAddresses(team, toValue(officers))
    ]
    const byAddress = new Map<string, Address>()
    for (const candidate of candidates) {
      if (candidate && isAddress(candidate)) byAddress.set(candidate.toLowerCase(), candidate)
    }
    return [...byAddress.values()]
  })

  const query = useQuery({
    queryKey: computed(
      () =>
        [
          INVESTOR_PERMISSIONS_QUERY_KEY,
          {
            address: investorAddress.value?.toLowerCase(),
            accounts: knownAccounts.value
              .map((address) => address.toLowerCase())
              .sort((left, right) => left.localeCompare(right))
          }
        ] as const
    ),
    enabled: computed(() => !!investorAddress.value && isAddress(investorAddress.value)),
    staleTime: 30_000,
    queryFn: async (): Promise<InvestorPermissionsResult> => {
      const address = investorAddress.value
      const client = getPublicClient(config, { chainId: currentChainId })
      if (!address || !client) {
        return {
          accounts: [],
          evidence: 'unavailable',
          gaps: ['The configured chain client is unavailable.']
        }
      }
      return fetchInvestorPermissions(client, address, knownAccounts.value)
    }
  })

  return { ...query, data: query.data as Ref<InvestorPermissionsResult | undefined> }
}

/** Direct on-chain authorization read used by write controls; never inferred from event history. */
export function useInvestorHasRole(role: MaybeRef<Hex>, account: MaybeRef<Address | undefined>) {
  const teamStore = useTeamStore()
  const investorAddress = computed(() => teamStore.getInvestorAddress())
  const roleValue = computed(() => unref(role))
  const accountValue = computed(() => unref(account))
  const accountArg = computed(() => accountValue.value ?? zeroAddress)

  const query = useReadContract({
    address: investorAddress,
    abi: investorAbi,
    functionName: 'hasRole',
    args: [roleValue, accountArg],
    query: {
      enabled: computed(
        () =>
          !!investorAddress.value &&
          isAddress(investorAddress.value) &&
          !!accountValue.value &&
          isAddress(accountValue.value)
      )
    }
  })

  return { ...query, data: query.data as Ref<boolean | undefined> }
}

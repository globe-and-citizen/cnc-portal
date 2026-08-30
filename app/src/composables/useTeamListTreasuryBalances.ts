import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useChainId } from '@wagmi/vue'
import { useQuery } from '@tanstack/vue-query'
import type { Address } from 'viem'
import { config as wagmiConfig } from '@/wagmi.config'
import { useCurrencyStore } from '@/stores'
import { SUPPORTED_TOKENS, type TokenId } from '@/constant'
import {
  fetchTokenBalances,
  toContractBalances,
  type RawTokenBalances
} from '@/lib/balances/tokenBalances'
import type { ContractBalances, Team } from '@/types'
import { buildTeamTreasuryDisplay, getTeamTreasuryAddresses } from '@/utils/teamTreasury'

const REFETCH_INTERVAL = 300_000

type TeamTreasuryRawBalances = Record<string, RawTokenBalances>

const addressKey = (address: Address) => address.toLowerCase()

/**
 * Reads every visible company's treasury accounts through one list-owned query.
 *
 * Each account still reads every supported token, but starting all account
 * reads in the same query function lets wagmi's batching transport combine
 * them. Failed account reads are omitted so the affected card remains
 * unavailable instead of displaying a false zero or hiding successful peers.
 */
export function useTeamListTreasuryBalances(teams: MaybeRefOrGetter<Team[] | undefined>) {
  const chainId = useChainId()
  const currencyStore = useCurrencyStore()
  const addresses = computed(() => {
    const uniqueAddresses = new Map<string, Address>()

    for (const team of toValue(teams) ?? []) {
      for (const address of getTeamTreasuryAddresses(team)) {
        uniqueAddresses.set(addressKey(address), address)
      }
    }

    return [...uniqueAddresses.values()]
  })

  const query = useQuery({
    queryKey: computed(
      () =>
        ['balance', 'team-list', { addresses: addresses.value, chainId: chainId.value }] as const
    ),
    enabled: computed(() => addresses.value.length > 0),
    refetchInterval: REFETCH_INTERVAL,
    queryFn: async (): Promise<TeamTreasuryRawBalances> => {
      const reads = await Promise.allSettled(
        addresses.value.map(async (address) => {
          const balances = await fetchTokenBalances(wagmiConfig, {
            address,
            chainId: chainId.value,
            tokens: SUPPORTED_TOKENS
          })
          return [addressKey(address), balances] as const
        })
      )

      return Object.fromEntries(
        reads.flatMap((read) => (read.status === 'fulfilled' ? [read.value] : []))
      )
    }
  })

  const balancesByAddress = computed<Readonly<Record<string, ContractBalances>>>(() => {
    const rawBalances = query.data.value ?? {}

    return Object.fromEntries(
      Object.entries(rawBalances).map(([address, raw]) => [
        address,
        toContractBalances(SUPPORTED_TOKENS, raw, (tokenId: TokenId) =>
          currencyStore.getTokenInfo(tokenId)
        )
      ])
    )
  })

  const treasuryByTeamId = computed(() =>
    Object.fromEntries(
      (toValue(teams) ?? []).map((team) => [
        team.id,
        buildTeamTreasuryDisplay(
          team,
          balancesByAddress.value,
          query.isLoading.value,
          currencyStore.localCurrency.code
        )
      ])
    )
  )

  return { treasuryByTeamId }
}

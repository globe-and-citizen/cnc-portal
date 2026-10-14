import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useChainId } from '@wagmi/vue'
import { useQueries, useQuery } from '@tanstack/vue-query'
import type { Address } from 'viem'
import { config as wagmiConfig } from '@/wagmi.config'
import { useCurrencyStore } from '@/stores'
import { currentChainId, SUPPORTED_TOKENS, type TokenId } from '@/constant'
import {
  fetchTokenBalances,
  toContractBalances,
  type RawTokenBalances
} from '@/lib/balances/tokenBalances'
import type { Team } from '@/types'
import { safeBalancesQueryOptions } from '@/queries/safeClient.queries'
import { getSafeValuedFiatTotal } from '@/utils/safe/portfolio'
import { buildTeamTreasuryDisplay, getTeamTreasuryAddresses } from '@/utils/teams/treasury'

const REFETCH_INTERVAL = 300_000

type TeamTreasuryRawBalances = Record<string, RawTokenBalances>

const addressKey = (address: Address) => address.toLowerCase()

/**
 * Batches CNC account RPC reads and shares Gateway observers for unique Safes.
 *
 * Each CNC account still reads every supported token, but starting all CNC account
 * reads in the same query function lets wagmi's batching transport combine
 * them. Failed account reads are omitted so the affected card remains
 * unavailable instead of displaying a false zero or hiding successful peers.
 */
export function useTeamListTreasuryBalances(teams: MaybeRefOrGetter<Team[] | undefined>) {
  const chainId = useChainId()
  const currencyStore = useCurrencyStore()
  const safeAddresses = computed(() => [
    ...new Map(
      (toValue(teams) ?? []).flatMap((team) => {
        const address = team.teamContracts?.find((contract) => contract.type === 'Safe')?.address
        return address ? [[addressKey(address), address] as const] : []
      })
    ).values()
  ])
  const safeQueries = useQueries({
    queries: computed(() =>
      safeAddresses.value.map((address) =>
        safeBalancesQueryOptions(address, currentChainId, currencyStore.localCurrency.code)
      )
    )
  })
  const safeByAddress = computed(() =>
    Object.fromEntries(
      safeAddresses.value.map((address, index) => [addressKey(address), safeQueries.value[index]])
    )
  )
  const addresses = computed(() => {
    const uniqueAddresses = new Map<string, Address>()

    for (const team of toValue(teams) ?? []) {
      const safeAddress = team.teamContracts?.find((contract) => contract.type === 'Safe')?.address
      for (const address of getTeamTreasuryAddresses(team)) {
        if (safeAddress && addressKey(address) === addressKey(safeAddress)) continue
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

  const amountsByAddress = computed<Readonly<Record<string, number>>>(() => {
    const rawBalances = query.data.value ?? {}

    const amounts = Object.fromEntries(
      Object.entries(rawBalances).map(([address, raw]) => [
        address,
        toContractBalances(SUPPORTED_TOKENS, raw, (tokenId: TokenId) =>
          currencyStore.getTokenInfo(tokenId)
        ).total.local.value
      ])
    )
    for (const [address, result] of Object.entries(safeByAddress.value)) {
      const total = getSafeValuedFiatTotal(result?.data)
      if (total !== undefined) amounts[address] = total
    }
    return amounts
  })

  const treasuryByTeamId = computed(() =>
    Object.fromEntries(
      (toValue(teams) ?? []).map((team) => [
        team.id,
        buildTeamTreasuryDisplay(
          team,
          amountsByAddress.value,
          query.isLoading.value ||
            team.teamContracts?.some(
              (contract) =>
                contract.type === 'Safe' &&
                safeByAddress.value[addressKey(contract.address)]?.isLoading
            ) ||
            false,
          currencyStore.localCurrency.code
        )
      ])
    )
  )

  return { treasuryByTeamId }
}

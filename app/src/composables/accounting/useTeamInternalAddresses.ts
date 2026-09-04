/**
 * Reactive, team-scoped set of the CNC's own contract addresses.
 *
 * Wraps {@link collectInternalAddresses} over a team's `TeamContract` rows.
 * The global FeeCollector is not a team-owned address: a Bank fee is an external
 * expense, never an internal move. Consumers use the returned set to classify a
 * transfer as an internal move vs a real inflow/outflow.
 */
import { computed, type ComputedRef } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { Address } from 'viem'
import { useGetTeamQuery } from '@/queries/team.queries'
import { collectInternalAddresses } from '@/utils/accounting/internalAddresses'

export interface UseTeamInternalAddressesReturn {
  /** The team's own contract addresses (checksum-normalized). */
  addresses: ComputedRef<Set<Address>>
  isLoading: ReturnType<typeof useGetTeamQuery>['isLoading']
  error: ReturnType<typeof useGetTeamQuery>['error']
}

export function useTeamInternalAddresses(
  teamId: MaybeRefOrGetter<string | null>
): UseTeamInternalAddressesReturn {
  const teamMeta = useGetTeamQuery({ pathParams: { teamId } })

  const addresses = computed(() => collectInternalAddresses(teamMeta.data.value?.teamContracts))

  return { addresses, isLoading: teamMeta.isLoading, error: teamMeta.error }
}

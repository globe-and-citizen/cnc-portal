/**
 * Reactive, team-scoped set of the CNC's own contract addresses.
 *
 * Wraps {@link collectInternalAddresses} over a team's `TeamContract` rows and
 * folds in the protocol-wide FeeCollector (a singleton, not a `TeamContract`).
 * Consumers use the returned set with {@link isInternalAddress} to classify a
 * transfer as an internal move vs a real inflow/outflow.
 */
import { computed, type ComputedRef } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { Address } from 'viem'
import { useGetTeamQuery } from '@/queries/team.queries'
import { FEE_COLLECTOR_ADDRESS } from '@/constant'
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

  const addresses = computed(() =>
    collectInternalAddresses(teamMeta.data.value?.teamContracts, [FEE_COLLECTOR_ADDRESS])
  )

  return { addresses, isLoading: teamMeta.isLoading, error: teamMeta.error }
}

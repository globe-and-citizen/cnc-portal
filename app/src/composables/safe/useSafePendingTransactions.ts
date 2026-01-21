import { computed, type MaybeRef } from 'vue'
import { useChainId } from '@wagmi/vue'
import { useSafePendingTransactionsQuery } from '@/queries/safe.queries'
import { useTeamStore } from '@/stores'

/**
 * Get Safe pending transactions from Transaction Service
 */
export function useSafePendingTransactions(safeAddressRef?: MaybeRef<string | undefined>) {
  const chainId = useChainId()
  const teamStore = useTeamStore()

  const safeAddress = computed(() => {
    if (safeAddressRef) {
      return typeof safeAddressRef === 'object' && 'value' in safeAddressRef
        ? safeAddressRef.value
        : safeAddressRef
    }
    return teamStore.currentTeam?.safeAddress
  })

  const query = useSafePendingTransactionsQuery(chainId, safeAddress)

  return {
    pendingTransactions: computed(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value || query.isFetching.value),
    error: computed(() => query.error.value),
    refetch: query.refetch
  }
}

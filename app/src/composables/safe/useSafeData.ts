import { computed, type MaybeRef } from 'vue'
import { useChainId } from '@wagmi/vue'
import { useSafeInfoQuery } from '@/queries/safe.queries'
import { useTeamStore } from '@/stores'

/**
 * Get Safe data with granular access to different properties
 * Replaces useSafeInfo, useSafeOwners, and useSafeThreshold
 * Following CNC Portal repository patterns
 */
export function useSafeData(safeAddressRef?: MaybeRef<string | undefined>) {
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

  const query = useSafeInfoQuery(chainId, safeAddress)

  // Granular computed properties for specific data access
  const safeInfo = computed(() => query.data.value ?? null)
  const owners = computed(() => query.data.value?.owners ?? [])
  const threshold = computed(() => query.data.value?.threshold ?? 1)
  const balance = computed(() => query.data.value?.balance ?? '0')
  const nonce = computed(() => query.data.value?.nonce ?? 0)
  const version = computed(() => query.data.value?.version ?? '')

  const isLoading = computed(() => query.isLoading.value || query.isFetching.value)
  const error = computed(() => query.error.value)

  return {
    // Complete data
    safeInfo,

    // Granular access (replaces separate composables)
    owners,
    threshold,
    balance,
    nonce,
    version,

    // States
    isLoading,
    error,
    refetch: query.refetch
  }
}

// Convenience exports for backward compatibility during migration
export function useSafeInfo(safeAddressRef?: MaybeRef<string | undefined>) {
  const { safeInfo, isLoading, error, refetch } = useSafeData(safeAddressRef)
  return { safeInfo, isLoading, error, refetch }
}

export function useSafeOwners(safeAddressRef?: MaybeRef<string | undefined>) {
  const { owners, isLoading, error, refetch } = useSafeData(safeAddressRef)
  return { owners, isLoading, error, refetch }
}

export function useSafeThreshold(safeAddressRef?: MaybeRef<string | undefined>) {
  const { threshold, isLoading, error, refetch } = useSafeData(safeAddressRef)
  return { threshold, isLoading, error, refetch }
}

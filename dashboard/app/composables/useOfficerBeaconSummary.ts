import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries } from '@tanstack/vue-query'
import { useClient } from '@wagmi/vue'
import { getStorageAt } from 'viem/actions'
import { getAddress, isAddressEqual, zeroAddress, type Address } from 'viem'
import { getTeamOfficers } from '~/api/contract'
import type { Team, TeamOfficer } from '~/types'

// ERC-1967 beacon slot — see officerBeacon.query.ts. Kept in sync here so the
// aggregate reads hit the exact same query cache as the per-row cells.
const BEACON_SLOT
  = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50'

export interface BeaconStat {
  // Null when the beacon slot is empty / not yet resolved.
  beacon: Address | null
  total: number
  current: number
  legacy: number
  // Count per Officer `version` value (e.g. { 'v0.10': 3, 'v0.11': 1, legacy: 2 }).
  versions: Record<string, number>
}

/**
 * Aggregate, across every team, which FactoryBeacon deployed each Officer and
 * how the Officers using it break down (current vs legacy, and per version).
 *
 * Reuses the ['team-officers', …] and ['officer-beacon', …] query keys so the
 * summary shares the cache with TeamOfficersCell / OfficerBeacon — no refetch.
 */
export const useOfficerBeaconSummary = (teams: MaybeRefOrGetter<Team[]>) => {
  const client = useClient()

  // 1. Officer linked list per team.
  const officerQueries = useQueries({
    queries: computed(() =>
      (toValue(teams) ?? []).map(team => ({
        queryKey: ['team-officers', { teamId: team.id }],
        queryFn: async () => await getTeamOfficers(team.id),
        staleTime: 1000 * 60 * 5
      }))
    )
  })

  const allOfficers = computed<TeamOfficer[]>(() =>
    officerQueries.value.flatMap(q => q.data ?? [])
  )

  // Unique Officer addresses (keep original casing so the key matches the cells).
  const uniqueAddresses = computed(() => [
    ...new Map(allOfficers.value.map(o => [o.address.toLowerCase(), o.address])).values()
  ])

  // 2. Resolve each Officer proxy's beacon on-chain.
  const beaconQueries = useQueries({
    queries: computed(() =>
      uniqueAddresses.value.map(address => ({
        queryKey: ['officer-beacon', { address }],
        queryFn: async (): Promise<Address | null> => {
          if (!client.value) return null
          const raw = await getStorageAt(client.value, {
            address: address as Address,
            slot: BEACON_SLOT
          })
          if (!raw) return null
          const beacon = getAddress(`0x${raw.slice(-40)}`)
          return isAddressEqual(beacon, zeroAddress) ? null : beacon
        },
        enabled: !!client.value,
        staleTime: Infinity
      }))
    )
  })

  const beaconByAddress = computed(() => {
    const map = new Map<string, Address | null>()
    uniqueAddresses.value.forEach((address, i) => {
      map.set(address.toLowerCase(), beaconQueries.value[i]?.data ?? null)
    })
    return map
  })

  // 3. Group every Officer by its resolved beacon.
  const stats = computed<BeaconStat[]>(() => {
    const byBeacon = new Map<string, BeaconStat>()

    for (const officer of allOfficers.value) {
      const beacon = beaconByAddress.value.get(officer.address.toLowerCase()) ?? null
      const key = beacon ?? '__unknown__'

      let entry = byBeacon.get(key)
      if (!entry) {
        entry = { beacon, total: 0, current: 0, legacy: 0, versions: {} }
        byBeacon.set(key, entry)
      }

      entry.total++
      if (officer.isCurrent) entry.current++
      else entry.legacy++

      const version = officer.version || 'unknown'
      entry.versions[version] = (entry.versions[version] ?? 0) + 1
    }

    // Resolved beacons first, biggest cohort first; unknown bucket last.
    return [...byBeacon.values()].sort((a, b) => {
      if (!a.beacon !== !b.beacon) return a.beacon ? -1 : 1
      return b.total - a.total
    })
  })

  const isLoading = computed(
    () =>
      officerQueries.value.some(q => q.isLoading)
      || beaconQueries.value.some(q => q.isLoading)
  )

  return { stats, isLoading }
}

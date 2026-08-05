import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries } from '@tanstack/vue-query'
import { useClient } from '@wagmi/vue'
import type { Address } from 'viem'
import { getTeamOfficers } from '~/api/contract'
import { fetchOfficerBeacon, officerBeaconQueryKey } from '~/queries/officerBeacon.query'
import { fetchOfficerOnchainVersion, officerVersionQueryKey } from '~/queries/officerVersion.query'
import { semverForOfficerBeacon } from '~/composables/useContractRegistry'
import type { Team } from '~/types'

export type AuditStatus = 'update' | 'aligned' | 'unresolved'
export type AuditSource = 'onchain' | 'beacon'

export interface OfficerVersionAuditRow {
  teamId: number
  teamName: string
  officerId: number
  address: string
  isCurrent: boolean
  // What the database says today.
  storedVersion: string | null
  // What the chain says, or null when neither probe answers.
  detectedVersion: string | null
  source: AuditSource | null
  status: AuditStatus
}

/**
 * Simulate `POST /admin/officer-versions/sync` entirely client-side: for every
 * Officer of every team, work out which generation it really is and compare
 * that with the version stored in the database.
 *
 * The detection deliberately mirrors backend/src/utils/officerVersion.ts step
 * for step — `version()` first, then the ERC-1967 beacon matched against the
 * registry. If the two ever drift, this preview stops predicting what the sync
 * would write, which is the whole point of showing it.
 *
 * Reuses the ['team-officers', …] / ['officer-beacon', …] query keys so the
 * page shares its cache with the team views instead of refetching.
 */
export const useOfficerVersionAudit = (teams: MaybeRefOrGetter<Team[] | undefined>) => {
  const chainId = Number(useRuntimeConfig().public.chainId)
  const client = useClient({ chainId })

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

  // Officers, each carrying the team it belongs to.
  const officers = computed(() =>
    (toValue(teams) ?? []).flatMap((team, index) =>
      (officerQueries.value[index]?.data ?? []).map(officer => ({ team, officer }))
    )
  )

  // Unique addresses (keep the original casing so the keys match the per-row cells).
  const uniqueAddresses = computed(() => [
    ...new Map(officers.value.map(({ officer }) => [
      officer.address.toLowerCase(),
      officer.address
    ])).values()
  ])

  // 2a. Ask each Officer directly (V2+).
  const versionQueries = useQueries({
    queries: computed(() =>
      uniqueAddresses.value.map(address => ({
        queryKey: officerVersionQueryKey(address),
        queryFn: async () => await fetchOfficerOnchainVersion(client.value, address),
        enabled: !!client.value,
        staleTime: Infinity
      }))
    )
  })

  // 2b. Fall back to the FactoryBeacon behind the proxy (pre-V2).
  const beaconQueries = useQueries({
    queries: computed(() =>
      uniqueAddresses.value.map(address => ({
        queryKey: officerBeaconQueryKey(address),
        queryFn: async () => await fetchOfficerBeacon(client.value, address),
        enabled: !!client.value,
        staleTime: Infinity
      }))
    )
  })

  const byAddress = computed(() => {
    const map = new Map<string, { version: string | null, beacon: Address | null }>()
    uniqueAddresses.value.forEach((address, index) => {
      map.set(address.toLowerCase(), {
        version: versionQueries.value[index]?.data ?? null,
        beacon: beaconQueries.value[index]?.data ?? null
      })
    })
    return map
  })

  const rows = computed<OfficerVersionAuditRow[]>(() =>
    officers.value.map(({ team, officer }) => {
      const probe = byAddress.value.get(officer.address.toLowerCase())
      const onchain = probe?.version ?? null
      const detectedVersion = onchain ?? semverForOfficerBeacon(probe?.beacon)
      const source: AuditSource | null = onchain ? 'onchain' : detectedVersion ? 'beacon' : null

      const storedVersion = officer.version ?? null
      const status: AuditStatus = !detectedVersion
        ? 'unresolved'
        : detectedVersion === storedVersion
          ? 'aligned'
          : 'update'

      return {
        teamId: team.id,
        teamName: team.name,
        officerId: officer.id,
        address: officer.address,
        isCurrent: officer.isCurrent,
        storedVersion,
        detectedVersion,
        source,
        status
      }
    })
  )

  const countBy = (status: AuditStatus) =>
    computed(() => rows.value.filter(row => row.status === status).length)

  const isLoading = computed(
    () =>
      officerQueries.value.some(query => query.isLoading)
      || versionQueries.value.some(query => query.isLoading)
      || beaconQueries.value.some(query => query.isLoading)
  )

  return {
    rows,
    total: computed(() => rows.value.length),
    toUpdate: countBy('update'),
    aligned: countBy('aligned'),
    unresolved: countBy('unresolved'),
    isLoading
  }
}

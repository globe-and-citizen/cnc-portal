import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import type { Team } from '@/types/team'

/** Role of a team relative to the current user. */
export type CompanyRole = 'owner' | 'employee'

/** Role filter applied to the companies list. 'all' keeps every team. */
export type CompanyRoleFilter = 'all' | CompanyRole

export interface UseCompaniesFilterOptions {
  /** Address of the signed-in user; drives the owner/employee split. */
  userAddress: MaybeRefOrGetter<string | null | undefined>
  /** Active role filter: 'all' | 'owner' | 'employee'. */
  role: MaybeRefOrGetter<CompanyRoleFilter>
  /** Free-text query matched (case-insensitive) against name + description. */
  query: MaybeRefOrGetter<string | null | undefined>
  /** Keep hidden teams in the result set. */
  showHidden: MaybeRefOrGetter<boolean | undefined>
  /** Keep archived teams in the result set. */
  showArchived: MaybeRefOrGetter<boolean | undefined>
}

export interface CompanyCounts {
  all: number
  owner: number
  employee: number
}

export interface UseCompaniesFilter {
  /** Teams left after visibility, role and query filtering. */
  filtered: ComputedRef<Team[]>
  /** Role split over the visibility-filtered set (ignores role + query). */
  counts: ComputedRef<CompanyCounts>
}

/**
 * Resolve a team's role for the given user. A team is 'owner' when its
 * `ownerAddress` matches the user (case-insensitive), otherwise 'employee'.
 */
function roleOf(team: Team, userAddress: string | null | undefined): CompanyRole {
  return team.ownerAddress?.toLowerCase() === userAddress?.toLowerCase() ? 'owner' : 'employee'
}

/**
 * Pure, reactive filtering for the companies list. All inputs are
 * `MaybeRefOrGetter`, so callers can pass refs, getters or plain values.
 *
 * The backing query already honours `showHidden` / `showArchived`, so the
 * visibility check here is a light guard (drop hidden/archived teams the query
 * may still return). Counts are the owner/employee split over that
 * visibility-filtered set and are independent of the active role + query, so
 * the segmented control keeps showing every bucket's size.
 */
export function useCompaniesFilter(
  teams: MaybeRefOrGetter<Team[] | null | undefined>,
  opts: UseCompaniesFilterOptions
): UseCompaniesFilter {
  /** Teams passing the visibility guard — the basis for counts and filtering. */
  const visible = computed<Team[]>(() => {
    const list = toValue(teams)
    if (!Array.isArray(list)) return []
    const showHidden = toValue(opts.showHidden) ?? false
    const showArchived = toValue(opts.showArchived) ?? false
    return list.filter(
      (team) => (showHidden || !team.isHidden) && (showArchived || !team.isArchived)
    )
  })

  const counts = computed<CompanyCounts>(() => {
    const userAddress = toValue(opts.userAddress)
    let owner = 0
    for (const team of visible.value) {
      if (roleOf(team, userAddress) === 'owner') owner += 1
    }
    return { all: visible.value.length, owner, employee: visible.value.length - owner }
  })

  const filtered = computed<Team[]>(() => {
    const userAddress = toValue(opts.userAddress)
    const role = toValue(opts.role)
    const query = (toValue(opts.query) ?? '').trim().toLowerCase()

    return visible.value.filter((team) => {
      if (role !== 'all' && roleOf(team, userAddress) !== role) return false
      if (query) {
        const haystack = `${team.name ?? ''} ${team.description ?? ''}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  })

  return { filtered, counts }
}

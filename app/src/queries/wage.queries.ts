import type { Wage } from '@/types'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { createQueryHook, createMutationHook, queryPresets } from './queryFactory'

/**
 * Query key factory for wage-related queries
 */
export const wageKeys = {
  all: ['wages'] as const,
  teams: () => [...wageKeys.all, 'team'] as const,
  team: (teamId: string | number | null) => [...wageKeys.teams(), { teamId }] as const
}

// ============================================================================
// GET /wage/ - Fetch team wages
// ============================================================================

/**
 * Combined parameters for useGetTeamWagesQuery
 */
export interface GetTeamWagesParams {
  queryParams: {
    /** Team ID */
    teamId: MaybeRefOrGetter<string | number | null>
  }
}

/**
 * Fetch team wage data by team ID
 *
 * @endpoint GET /wage/
 * @pathParams none
 * @queryParams { teamId: string | number }
 * @body none
 */
export const useGetTeamWagesQuery = createQueryHook<Wage[], GetTeamWagesParams>({
  endpoint: 'wage/',
  queryKey: (params) => wageKeys.team(toValue(params.queryParams.teamId)),
  enabled: (params) => !!toValue(params.queryParams.teamId),
  options: {
    ...queryPresets.stable,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  }
})

// ============================================================================
// PUT /wage/setWage - Set member wage
// ============================================================================

/**
 * Request body for setting member wage
 */
export interface SetWageBody {
  /** Team ID */
  teamId: string | number
  /** User wallet address */
  userAddress: string
  /** Rate per hour for different token types */
  ratePerHour: Array<{ type: string; amount: number }>
  /** Maximum hours allowed per week */
  maximumHoursPerWeek: number
}

/**
 * Combined parameters for useSetMemberWageMutation
 */
export interface SetMemberWageParams {
  body: SetWageBody
}

/**
 * Set member wage data for a team
 *
 * @endpoint PUT /wage/setWage
 * @pathParams none
 * @queryParams none
 * @body SetWageBody
 */
export const useSetMemberWageMutation = createMutationHook<void, SetMemberWageParams>({
  method: 'PUT',
  endpoint: 'wage/setWage',
  invalidateKeys: (params) => [wageKeys.team(params.body.teamId)]
})

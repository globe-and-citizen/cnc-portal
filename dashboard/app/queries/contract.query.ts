import { useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { getTeamOfficers } from '~/api/contract'

/**
 * Fetch the Officer linked-list history for a team (newest first).
 */
export const useTeamOfficersQuery = (teamId: MaybeRefOrGetter<number>) => {
  return useQuery({
    queryKey: ['team-officers', { teamId: toValue(teamId) }],
    queryFn: async () => await getTeamOfficers(toValue(teamId)),
    enabled: () => !!toValue(teamId),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}

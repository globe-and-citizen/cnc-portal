import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { getTeamOfficers, syncOfficerVersions } from '~/api/contract'

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

/**
 * Realign every stored Officer version with the generation detected on-chain.
 * Pass `{ dryRun: true }` to get the report without writing.
 */
export const useSyncOfficerVersionsMutation = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (payload: { dryRun?: boolean } = {}) => {
      return await syncOfficerVersions(payload)
    },
    onSuccess: (report) => {
      if (report.dryRun) return

      // Officer versions are embedded in both payloads.
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team-officers'] })
      toast.add({
        title: 'Success',
        description: `${report.updated} of ${report.scanned} Officer versions realigned`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    },
    onError: (error) => {
      toast.add({
        title: 'Error',
        description: error?.message || 'Failed to sync Officer versions',
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  })
}

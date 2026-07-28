import type { TeamOfficer } from '~/types'
import { apiFetch } from '~/lib/fetch'

/**
 * Fetch the Officer linked-list history for a team (newest first).
 * Backend: GET /api/contract/officers?teamId=<id>
 */
export const getTeamOfficers = async (teamId: number) => {
  return await apiFetch<TeamOfficer[]>('/contract/officers', {
    query: { teamId }
  })
}

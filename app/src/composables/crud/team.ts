import { useCustomFetch } from '../useCustomFetch'
import type { TeamsResponse } from '@/types'

export function useGetTeams() {
  const {
    isFetching: teamsAreFetching,
    data,
    error,
    execute
  } = useCustomFetch<TeamsResponse>('teams').json()

  return {
    teamsAreFetching,
    data,
    error,
    execute
  }
}
export function useGetTeam(id: string) {
  const {
    isFetching: teamIsFetching,
    data,
    error,
    execute
  } = useCustomFetch<TeamsResponse>(`teams/${id}`).json()

  return {
    teamIsFetching,
    data,
    error,
    execute
  }
}

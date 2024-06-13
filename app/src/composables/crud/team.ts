import { useCustomFetch } from '../useCustomFetch'
import type { TeamResponse, Team, TeamsResponse } from '@/types'
import { watch, ref } from 'vue'

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
  console.log('id', id)
  const {
    isFetching: teamIsFetching,
    data,
    error,
    execute
  } = useCustomFetch<TeamResponse>(`teams/${id}`).json()

  return {
    teamIsFetching,
    data,
    error,
    execute
  }
}
export function useUpdateTeam() {
  const teamIsUpdating = ref(false)
  const data = ref<any>()
  const error = ref<any>()

  const execute = async (id: string, team: Partial<Team>) => {
    const requestData = {
      ...team
    }
    teamIsUpdating.value = true
    try {
      const { data: updatedTeam, error: err } = await useCustomFetch<TeamResponse>(`teams/${id}`)
        .put(JSON.stringify(requestData))
        .json()
      data.value = updatedTeam
      error.value = err.value
    } catch (err: any) {
      data.value = null
      error.value = err.value
    } finally {
      teamIsUpdating.value = false
    }
  }

  return {
    teamIsUpdating,
    data,
    error,
    execute
  }
}
export function useDeleteTeam(id: string) {
  const {
    isFetching: teamIsDeleting,
    data,
    error,
    execute
  } = useCustomFetch<TeamsResponse>(`teams/${id}`).delete().json()

  return {
    teamIsDeleting,
    data,
    error,
    execute
  }
}

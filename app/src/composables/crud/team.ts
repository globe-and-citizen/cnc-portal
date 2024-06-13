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
  const isSuccess = ref(false)

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
      isSuccess.value = true
    } catch (err: any) {
      data.value = null
      error.value = err.value
    } finally {
      teamIsUpdating.value = false
    }
  }

  return {
    teamIsUpdating,
    isSuccess,
    data,
    error,
    execute
  }
}
export function useDeleteTeam() {
  const isFetching = ref(false)
  const data = ref<any>()
  const error = ref<any>()
  const isSuccess = ref(false)

  const execute = async (id: string) => {
    const { data: deletedTeam, error } = useCustomFetch<TeamsResponse>(`teams/${id}`)
      .delete()
      .json()

    data.value = deletedTeam.value
    isSuccess.value = true
  }
  return {
    teamIsDeleting: isFetching,
    isSuccess,
    data,
    error,
    execute
  }
}

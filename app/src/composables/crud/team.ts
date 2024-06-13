import { useCustomFetch } from '../useCustomFetch'
import type { TeamResponse, Team, TeamsResponse, Member } from '@/types'
import { watch, ref } from 'vue'

export function useCreateTeam() {
  const teamIsCreating = ref(false)
  const data = ref<any>()
  const error = ref<any>()
  const isSuccess = ref(false)

  const execute = async (name: string, description: string, members: Partial<Member>[]) => {
    const requestData = {
      name,
      description,
      members
    }

    teamIsCreating.value = true
    try {
      const { data: newTeam, error: err } = await useCustomFetch<TeamResponse>('teams')
        .post(JSON.stringify(requestData))
        .json()
      data.value = newTeam
      error.value = err.value
      isSuccess.value = true
    } catch (err: any) {
      data.value = null
      error.value = err.value
    } finally {
      teamIsCreating.value = false
    }
  }
  return {
    teamIsCreating,
    isSuccess,
    data,
    error,
    execute
  }
}
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
export function useGetTeam(id?: string) {
  const fetchingTeam = ref(false)
  const data = ref<any>()
  const error = ref<any>()
  const isSuccess = ref(false)

  const execute = async (id: string): Promise<any> => {
    const { data: team, error: err } = await useCustomFetch<TeamResponse>(`teams/${id}`).json()
    data.value = team
    error.value = err.value
    isSuccess.value = true
    return team
  }
  return {
    teamIsFetching: fetchingTeam,
    data,
    error,
    isSuccess,
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

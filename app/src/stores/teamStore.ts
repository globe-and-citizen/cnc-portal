import { useCustomFetch } from '@/composables/useCustomFetch'
import type { Team } from '@/types/team'
import { defineStore } from 'pinia'
import { onMounted, ref, watch } from 'vue'

export const useTeamStore = defineStore('team', () => {
  // TODO: fetch teams on mounted
  // Having caching system,
  // And trigger fetch on demand
  // Update cache system.

  // const teams = ref([])
  const currentTeamId = ref<string | null>(null)
  const teamsFetched = ref<Map<string, Team>>(new Map())
  const teamURI = ref<string>('teams/id')

  /**
   * @description Fetch teams lists
   * @returns teams, teamsAreFetching, teamsError, executeFetchTeams
   */
  const {
    isFetching: teamsAreFetching,
    error: teamsError,
    data: teams,
    execute: executeFetchTeams
  } = useCustomFetch('teams', { immediate: false }).json()

  /**
   * @description Fetch team by id
   * @returns team, teamIsFetching, teamError, executeFetchTeam
   */
  const {
    isFetching: teamIsFetching,
    error: teamError,
    data: team,
    execute: executeFetchTeam
  } = useCustomFetch(teamURI, { immediate: false }).json()

  /**
   * @description Fetch team by id and update the team cache
   * @param teamId
   * @returns team, teamIsFetching, teamError, executeFetchTeam
   */
  const fetchTeam = (teamId: string) => {
    teamURI.value = `teams/${teamId}`
    executeFetchTeam()
    return {
      teamIsFetching,
      teamError,
      team
    }
  }

  const setCurrentTeamId = (teamId: string) => {
    currentTeamId.value = teamId
  }

  const getCurrentTeam = () => {
    return currentTeamId.value ? teamsFetched.value.get(currentTeamId.value) : undefined
  }

  /**
   * @description Watch the team and update the teamsFetched cache
   */
  watch(team, () => {
    console.log('team fetched', team.value)
    teamsFetched.value.set(team.value.id, team.value)
  })

  watch(teams, (newTeamsVal) => {
    // set the current team id to the first team id if not already set and teams is not empty
    if (!currentTeamId.value && newTeamsVal.length > 0) {
      currentTeamId.value = newTeamsVal[0].id
    }
  })

  watch(currentTeamId, (newCurrentTeamIdVal) => {
    console.log('current team id', newCurrentTeamIdVal)
    // fetch the current team
    if (newCurrentTeamIdVal) {
      fetchTeam(newCurrentTeamIdVal)
    }
  })

  // Check if the teams are fetching if not fetch team again
  const reloadTeams = () => {
    if (teamsAreFetching.value) return
    else {
      executeFetchTeams()
    }
  }

  // Fetch teams on mounted
  // Todo count how many time it's called or mounted
  onMounted(() => {
    reloadTeams()
  })

  return {
    currentTeamId,
    teamsMeta: {
      teams,
      teamsAreFetching,
      teamsError,
      executeFetchTeams,
      reloadTeams
    },
    fetchTeam,
    setCurrentTeamId,
    getCurrentTeam
  }
})

import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore } from '@/stores/useToastStore'
import type { Team } from '@/types/team'
import { log } from '@/utils/generalUtil'
import { defineStore } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'

export const useTeamStore = defineStore('team', () => {
  // TODO: fetch teams on mounted
  // Having caching system,
  // And trigger fetch on demand
  // Update cache system.

  // const teams = ref([])
  const currentTeamId = ref<string | null>(null)
  const teamsFetched = ref<Map<string, Team>>(new Map())
  const teamURI = ref<string>('teams/id')
  const { addErrorToast } = useToastStore()

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
  const fetchTeam = async (teamId: string) => {
    teamURI.value = `teams/${teamId}`
    await executeFetchTeam()
    teamsFetched.value.set(String(team.value.id), team.value)
    return {
      teamIsFetching,
      teamError,
      team
    }
  }

  const setCurrentTeamId = async (teamId: string) => {
    log.info('Setting current team id to :', teamId)
    if (currentTeamId.value === teamId) return
    currentTeamId.value = teamId
    await fetchTeam(currentTeamId.value)
  }
  const currentTeam = computed(() => {
    return currentTeamId.value ? teamsFetched.value.get(String(currentTeamId.value)) : undefined
  })


  watch(teams, (newTeamsVal) => {
    // set the current team id to the first team id if not already set and teams is not empty
    if (!currentTeamId.value && newTeamsVal.length > 0) {
      log.info('Current team id not set, setting to first team id:', newTeamsVal[0].id)
      setCurrentTeamId(newTeamsVal[0].id)
    }
  })

  watch(teamsError, () => {
    if (teamsError.value) {
      log.error('Failed to load user teams', teamsError.value)
      addErrorToast('Failed to load user teams')
    }
  })
  watch(teamError, () => {
    if (teamError.value) {
      log.error('Failed to load user team', teamError.value)
      addErrorToast('Failed to load user team')
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
      reloadTeams
    },
    fetchTeam,
    setCurrentTeamId,
    currentTeam
  }
})

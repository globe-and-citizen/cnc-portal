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
  const { addErrorToast, addSuccessToast } = useToastStore()

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
    execute: executeFetchTeam,
    statusCode
  } = useCustomFetch(teamURI, { immediate: false }).json()

  /**
   * @description Add a contract to a team
   * @param address
   * @param deployer
   * @returns Promise<void>
   */
  const addContractToTeam = async (teamId: string, address: string, deployer: string) => {
    try {
      await useCustomFetch(`teams/contract/add`)
        .post({
          teamId,
          contractAddress: address,
          contractType: 'Campaign',
          deployer
        })
        .json()
      addSuccessToast(`Contract added to team  successfully`)
    } catch (error) {
      console.error(`Failed to add contract to team `, error)
      addErrorToast('Failed to add contract to team')
    }
  }

  /**
   * @description Fetch team by id and update the team cache
   * @param teamId
   * @returns team, teamIsFetching, teamError, executeFetchTeam
   */
  const fetchTeam = async (teamId: string) => {
    teamURI.value = `teams/${teamId}`
    await executeFetchTeam()
    if (team.value) {
      teamsFetched.value.set(String(team.value.id), team.value)
    } else {
      log.error('Team is falsy')
    }
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
      log.info('new Val', newTeamsVal)
      log.info('Current team id not set, setting to first team id:', newTeamsVal[0].id)
      setCurrentTeamId(newTeamsVal[0].id)
    }
  })

  watch(teamsError, () => {
    if (teamsError.value) {
      log.error('Failed to load user teams \n', teamsError.value)
      addErrorToast('Failed to load user teams')
    }
  })
  watch(teamError, () => {
    if (teamError.value) {
      log.error('Failed to load user team \n', teamError.value)
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
    currentTeam,
    currentTeamMeta: {
      teamIsFetching,
      teamError,
      team,
      statusCode,
      executeFetchTeam
    },
    addContractToTeam
  }
})

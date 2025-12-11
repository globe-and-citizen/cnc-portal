import { useUserDataStore } from '@/stores/user'
import { useToastStore } from '@/stores/useToastStore'
import type { ContractType } from '@/types'
import type { Team } from '@/types/team'
import { log } from '@/utils/generalUtil'
import { defineStore } from 'pinia'
import type { Address } from 'viem'
import { computed, onMounted, ref, watch } from 'vue'
import { useTeams, useTeam } from '@/queries/team.queries'

export const useTeamStore = defineStore('team', () => {
  // TODO: fetch teams on mounted
  // Having caching system,
  // And trigger fetch on demand
  // Update cache system.

  // const teams = ref([])
  const currentTeamId = ref<string | null>(null)
  const teamsFetched = ref<Map<string, Team>>(new Map())
  const { addErrorToast } = useToastStore()
  const userDataStore = useUserDataStore()

  /**
   * @description Fetch teams lists using TanStack Query
   */
  const {
    data: teams,
    isLoading: teamsAreFetching,
    error: teamsError,
    refetch: executeFetchTeams
  } = useTeams(() => userDataStore.address)

  /**
   * @description Fetch team by id using TanStack Query
   */
  const {
    data: team,
    isLoading: teamIsFetching,
    error: teamError,
    refetch: executeFetchTeam
  } = useTeam(currentTeamId)

  // Compute status code from error if available
  const statusCode = computed(() => {
    if (teamError.value) {
      const errorWithStatus = teamError.value as Error & { status?: number }
      return errorWithStatus.status
    }
    return undefined
  })

  /**
   * @description Fetch team by id and update the team cache
   * @param teamId
   * @returns team, teamIsFetching, teamError, executeFetchTeam
   */
  const fetchTeam = async (teamId: string | undefined) => {
    if (!teamId) {
      log.error('Team ID is required')
      return {
        teamIsFetching,
        teamError,
        team
      }
    }
    currentTeamId.value = teamId
    const result = await executeFetchTeam()
    if (result.data) {
      teamsFetched.value.set(String(result.data.id), result.data)
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

  const getContractAddressByType = (type: ContractType): Address | undefined => {
    return currentTeam.value?.teamContracts.find((contract) => contract.type === type)?.address
  }

  watch(teams, (newTeamsVal) => {
    // set the current team id to the first team id if not already set and teams is not empty
    if (!currentTeamId.value && newTeamsVal && newTeamsVal.length > 0) {
      const firstTeam = newTeamsVal[0]
      if (firstTeam) {
        log.info('new Val', newTeamsVal)
        log.info('Current team id not set, setting to first team id:', firstTeam.id)
        setCurrentTeamId(firstTeam.id)
      }
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
    getContractAddressByType
  }
})

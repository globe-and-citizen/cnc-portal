import { useToastStore } from '@/stores/useToastStore'
import type { ContractType } from '@/types'
import type { Team } from '@/types/team'
import { log } from '@/utils/generalUtil'
import { defineStore } from 'pinia'
import type { Address } from 'viem'
import { computed,  ref, watch } from 'vue'
import {  useTeam } from '@/queries/team.queries'

export const useTeamStore = defineStore('team', () => {
  const currentTeamId = ref<string | null>(null)
  const teamsFetched = ref<Map<string, Team>>(new Map())
  const { addErrorToast } = useToastStore()


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
    await executeFetchTeam()
    // Use the reactive team reference which is automatically updated by TanStack Query
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

  const getContractAddressByType = (type: ContractType): Address | undefined => {
    return currentTeam.value?.teamContracts.find((contract) => contract.type === type)?.address
  }

  watch(teamError, () => {
    if (teamError.value) {
      log.error('Failed to load user team \n', teamError.value)
      addErrorToast('Failed to load user team')
    }
  })

  return {
    currentTeamId,
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

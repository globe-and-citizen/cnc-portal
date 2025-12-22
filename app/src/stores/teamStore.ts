import { useToastStore } from '@/stores/useToastStore'
import type { ContractType } from '@/types'
// import type { Team } from '@/types/team'
import { log } from '@/utils/generalUtil'
import { defineStore } from 'pinia'
import type { Address } from 'viem'
import { ref, watch } from 'vue'
import { useTeam } from '@/queries/team.queries'

export const useTeamStore = defineStore('team', () => {
  const currentTeamId = ref<string | null>(null)
  const { addErrorToast } = useToastStore()

  /**
   * @description Fetch team by id using TanStack Query
   */
  const { data: team, isLoading: teamIsFetching, error: teamError } = useTeam(currentTeamId)

  // Compute status code from error if available
  // const statusCode = computed(() => {
  //   if (teamError.value) {
  //     const errorWithStatus = teamError.value as Error & { status?: number }
  //     return errorWithStatus.status
  //   }
  //   return undefined
  // })

  const setCurrentTeamId = async (teamId: string) => {
    log.info('Setting current team id to :', teamId)
    if (currentTeamId.value === teamId) return
    currentTeamId.value = teamId
  }

  const getContractAddressByType = (type: ContractType): Address | undefined => {
    return team.value?.teamContracts.find((contract) => contract.type === type)?.address
  }

  watch(teamError, () => {
    if (teamError.value) {
      log.error('Failed to load user team \n', teamError.value)
      addErrorToast('Failed to load user team')
    }
  })

  return {
    currentTeamId,
    setCurrentTeamId,
    /**
     * @deprecated use currentTeamMeta.team instead
     */
    currentTeam: team,
    currentTeamMeta: {
      teamIsFetching,
      teamError,
      team
      // statusCode
    },
    getContractAddressByType
  }
})

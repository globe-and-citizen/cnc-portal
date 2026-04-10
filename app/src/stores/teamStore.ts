import type { ContractType } from '@/types'
// import type { Team } from '@/types/team'
import { log } from '@/utils/generalUtil'
import { defineStore } from 'pinia'
import type { Address } from 'viem'
import { ref, watch } from 'vue'
import { useGetTeamQuery } from '@/queries/team.queries'

export const useTeamStore = defineStore('team', () => {
  const currentTeamId = ref<string | null>(null)
  const toast = useToast()

  /**
   * @description Fetch team by id using TanStack Query
   */
  const currentTeamMeta = useGetTeamQuery({ pathParams: { teamId: currentTeamId } })

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
    return currentTeamMeta.data.value?.teamContracts.find((contract) => contract.type === type)
      ?.address
  }

  watch(currentTeamMeta.error, () => {
    if (currentTeamMeta.error.value) {
      log.error('Failed to load user team \n', currentTeamMeta.error.value)
      toast.add({ title: 'Failed to load user team', color: 'error' })
    }
  })

  return {
    currentTeamId,
    setCurrentTeamId,
    /**
     * @deprecated use currentTeamMeta.data instead
     */
    currentTeam: currentTeamMeta.data,
    currentTeamMeta,
    getContractAddressByType
  }
})

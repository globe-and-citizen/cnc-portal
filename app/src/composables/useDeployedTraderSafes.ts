/**
 * @composable useDeployedTraderSafes
 * @description
 * Retrieves deployed trader safes for the current team.
 * Filters team members marked as traders and includes only those with deployed safes.
 *
 * @returns {Object} Object with:
 *   - deployedTraderSafes: computed array of deployed trader safes with name and address
 *   - isCheckingDeployment: computed boolean indicating if deployment status is being checked
 */

import { computed } from 'vue'
import { useTeamStore } from '@/stores'
import type { Member } from '@/types'

export interface TraderSafe {
  name: string
  address: string
  trader: Member
}

export const useDeployedTraderSafes = () => {
  const teamStore = useTeamStore()

  const deployedTraderSafes = computed((): TraderSafe[] => {
    const members = teamStore.currentTeamMeta?.data?.members || []

    return members
      .filter((member) => {
        // Only include members marked as traders with deployed safes
        const isTrader = member.memberTeamsData?.[0]?.isTrader === true
        const hasSafeAddress = !!member.traderSafeAddress && member.traderSafeAddress !== ''
        return isTrader && hasSafeAddress
      })
      .map((member) => ({
        name: `${member.name}'s Safe`,
        address: member.traderSafeAddress!,
        trader: member
      }))
  })

  return {
    deployedTraderSafes
  }
}

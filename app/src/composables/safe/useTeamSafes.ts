import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTeamStore, useUserDataStore } from '@/stores'
import { deriveSafeFromEoa } from '@/utils/trading/safeDeploymentUtils'
import type { SafeWallet } from '@/types'

export const useTeamSafes = () => {
  const teamStore = useTeamStore()
  const userDataStore = useUserDataStore()
  const route = useRoute()

  const safes = computed(() => {
    return (
      teamStore.currentTeamMeta.data?.members
        .filter((m) => m.memberTeamsData?.[0]?.isTrader === true)
        .map((m) => ({
          address: m.traderSafeAddress || '',
          name: `${m.name}'s Safe` || 'Unnamed Safe',
          balance: '0' // Placeholder, balance fetching can be implemented later
        })) || []
    )
  })

  const initialSafe = computed(() => {
    return (
      safes.value.find(
        (s) =>
          s.address.toLocaleLowerCase() ===
          deriveSafeFromEoa(userDataStore.address)?.toLocaleLowerCase()
      )?.address ?? safes.value[0]?.address
    )
  })

  const selectedSafe = computed<SafeWallet | undefined>(() => {
    const address = route.params.address as string
    return safes.value.find((s) => s.address.toLocaleLowerCase() === address.toLocaleLowerCase())
  })

  return {
    safes,
    initialSafe,
    selectedSafe
  }
}

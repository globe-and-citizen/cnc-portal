import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTeamStore } from '@/stores'
import type { SafeWallet } from '@/types'

export const useTeamSafes = () => {
  const teamStore = useTeamStore()
  const route = useRoute()

  const safes = computed(() => {
    if (route.name !== 'safe-account') {
      return []
    }

    const bankSafeAddress = teamStore.currentTeamMeta?.data?.safeAddress
    if (!bankSafeAddress) {
      return []
    }

    return [
      {
        address: bankSafeAddress,
        name: 'Bank Safe',
        balance: '0'
      } as SafeWallet
    ]
  })

  const selectedSafe = computed<SafeWallet | undefined>(() => {
    const address = route.params.address as string
    return safes.value.find((s) => s?.address?.toLocaleLowerCase() === address?.toLocaleLowerCase())
  })

  return {
    selectedSafe
  }
}

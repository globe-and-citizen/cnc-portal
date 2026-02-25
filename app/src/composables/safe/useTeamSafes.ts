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

    const bankSafeAddress = teamStore.getContractAddressByType('Safe')
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
    // For safe-account route, select the Bank Safe (first safe in the list)
    if (route.name === 'safe-account') {
      return safes.value.length > 0 ? safes.value[0] : undefined
    }

    // For trading route, match by address parameter
    const address = route.params.address as string
    return safes.value.find((s) => s?.address?.toLocaleLowerCase() === address?.toLocaleLowerCase())
  })

  return {
    selectedSafe
  }
}

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTeamStore, useUserDataStore } from '@/stores'
import { deriveSafeFromEoa } from '@/utils/trading/safeDeploymentUtils'
import type { SafeWallet } from '@/types'
import { useGetSafeInfoQuery } from '@/queries/safe.queries'

export const useTeamSafes = () => {
  const teamStore = useTeamStore()
  const userDataStore = useUserDataStore()
  const route = useRoute()

  const safes = computed(() => {
    // 1. Get the base collection of trader safes
    const traderSafes =
      teamStore.currentTeamMeta?.data?.members
        .filter((m) => m.memberTeamsData?.[0]?.isTrader === true)
        .map((m) => ({
          address: m.traderSafeAddress || '',
          name: `${m.name}'s Safe` || 'Unnamed Safe',
          balance: '0',
          userName: m.name
        }))
        .filter((safe) => safe.address) || [] // Filter out safes without addresses

    // 2. Check if the current route is 'safe-account'
    if (route.name === 'safe-account') {
      // 3. Get the team Safe address from contracts
      const bankSafeAddress = teamStore.getContractAddressByType('Safe')

      // 4. Only add Bank Safe if it exists and is deployed
      if (bankSafeAddress) {
        const bankSafe = {
          address: bankSafeAddress,
          name: 'Bank Safe',
          balance: '0'
        } as SafeWallet

        return [bankSafe, ...traderSafes]
      }

      // If no Bank Safe deployed, return empty array to trigger deployment UI
      return []
    }

    // 5. Default return the trader safes for other routes
    return traderSafes
  })

  const initialSafe = computed(() => {
    // Make the current user's safe the initial safe
    return deriveSafeFromEoa(userDataStore.address)
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

  const selectedSafeAddress = computed(() => selectedSafe.value?.address)

  const { data: safeInfo } = useGetSafeInfoQuery({
    pathParams: { safeAddress: selectedSafeAddress }
  })

  const isSafeOwner = computed(() => {
    if (!userDataStore.address || !safeInfo.value?.owners?.length) return false

    return safeInfo.value.owners.some(
      (owner) => owner.toLowerCase() === userDataStore.address!.toLowerCase()
    )
  })

  const isSelectedSafeTrader = computed(() => {
    if (!userDataStore.address) return false

    return (
      selectedSafeAddress.value?.toLocaleLowerCase() ===
      deriveSafeFromEoa(userDataStore.address)?.toLocaleLowerCase()
    )
  })

  return {
    safes,
    initialSafe,
    selectedSafe,
    selectedSafeAddress,
    isSafeOwner,
    isSelectedSafeTrader
  }
}

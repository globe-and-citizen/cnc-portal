import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTeamStore, useUserDataStore } from '@/stores'
import { deriveSafeFromEoa } from '@/utils/trading/safeDeploymentUtils'
import type { SafeWallet } from '@/types'
import { useSafeInfoQuery } from '@/queries/safe.queries'

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
          balance: '0'
        })) || []

    // 2. Check if the current route is 'safe-account'
    if (route.name === 'safe-account') {
      // 3. Define the additional "Bank Safe" object
      const bankSafe = {
        address: teamStore.currentTeamMeta?.data?.safeAddress,
        name: 'Bank Safe',
        balance: '0'
      } as SafeWallet

      // 4. Return a new array with the bank safe appended
      // We only append it if the address is actually present
      if (bankSafe.address) {
        return [bankSafe, ...traderSafes]
      } else {
        return []
      }
    }

    // 5. Default return the original collection if route is 'trading' or something else
    return traderSafes
  })

  const initialSafe = computed(() => {
    // Make the current user's safe the initial safe
    return deriveSafeFromEoa(userDataStore.address)
  })

  const selectedSafe = computed<SafeWallet | undefined>(() => {
    const address = route.params.address as string
    return safes.value.find((s) => s?.address?.toLocaleLowerCase() === address?.toLocaleLowerCase())
  })

  const selectedSafeAddress = computed(() => selectedSafe.value?.address)

  const { data: safeInfo } = useSafeInfoQuery(selectedSafeAddress)

  const isSafeOwner = computed(() => {
    if (!userDataStore.address || !safeInfo.value?.owners?.length) return false

    return safeInfo.value.owners.some(
      (owner) => owner.toLowerCase() === userDataStore.address!.toLowerCase()
    )
  })

  return {
    safes,
    initialSafe,
    selectedSafe,
    selectedSafeAddress,
    isSafeOwner
  }
}

// stores/safeStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SafeWallet {
  address: string
  name: string
  balance: string
}

export const useTraderSafesStore = defineStore('safe', () => {
  // State: ref() becomes state
  const safes = ref<SafeWallet[]>([
    {
      address: '0xBBa983bD0D0ef0e5Ce49B2c47bE92F01C11856A4',
      name: "Ali's Trader Safe",
      balance: '1.2543'
    },
    {
      address: '0xFfaAf4f04A0c65E299F8B51625bb61ceca679901',
      name: "Walter's Trader Safe",
      balance: '45.6789'
    },
    {
      address: '0xDC65081231D30A2f38aeB8875FB1ae7123F8e355',
      name: "Ravi's Trader Safe",
      balance: '12.3456'
    }
  ])

  const selectedSafe = ref<SafeWallet | undefined>(safes.value[0])

  // Actions: function() becomes an action
  function setSelectedSafe(safe: SafeWallet) {
    selectedSafe.value = safe
  }

  return {
    safes,
    selectedSafe,
    setSelectedSafe
  }
})

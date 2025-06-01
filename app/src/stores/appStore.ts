import { useAccount, useSwitchChain } from '@wagmi/vue'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useToastStore } from './useToastStore'

export const useAppStore = defineStore('app', () => {
  const showAddTeamModal = ref(false)
  const { chainId } = useAccount()
  const SUPPORTED_CHAINS = [137, 31337, 80002, 11155111]
  const toastStore = useToastStore()
  const { switchChain } = useSwitchChain()

  const setShowAddTeamModal = (value: boolean) => {
    showAddTeamModal.value = value
  }

  watch(chainId, (val) => {
    if (val === undefined) return

    if (!SUPPORTED_CHAINS.includes(val)) {
      // console.log('here', val)
      toastStore.addErrorToast('Unsupported chain')
      switchChain({
        chainId: 11155111
      })
    }
  })

  return {
    showAddTeamModal,
    setShowAddTeamModal
  }
})

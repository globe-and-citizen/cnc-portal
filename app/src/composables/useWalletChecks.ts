import { ref, watch } from 'vue'
import { useToastStore } from '@/stores'
import { useConnect, useSwitchChain, useAccount, injected } from '@wagmi/vue'
import { NETWORK } from '@/constant'
import { log, parseError } from '@/utils'

export function useWalletChecks() {
  // Refs
  const isProcessing = ref(false)
  const isSuccess = ref(false)

  // Composables
  const { addErrorToast } = useToastStore()
  const { connectAsync, error: connectError } = useConnect()
  const { switchChainAsync } = useSwitchChain()
  const { isConnected } = useAccount()

  // Functions
  async function performChecks() {
    try {
      isSuccess.value = false
      isProcessing.value = true
      const networkChainId = parseInt(NETWORK.chainId)

      if (!isConnected.value) {
        await connectAsync({ connector: injected(), chainId: networkChainId })
      }

      await switchChainAsync({
        chainId: networkChainId
      })

      if (isConnected.value) {
        isSuccess.value = true
      } else {
        isProcessing.value = false
        return
      }
    } catch (error) {
      addErrorToast('Failed to validate wallet and network.')
      log.error('performChecks.catch', parseError(error))
      isProcessing.value = false
    }
  }

  // Watch
  watch(connectError, (newConnectError) => {
    if (newConnectError) {
      addErrorToast(newConnectError.message)
      log.error('connectError.value', newConnectError)
      isProcessing.value = false
    }
  })

  return { isProcessing, performChecks, isSuccess }
}

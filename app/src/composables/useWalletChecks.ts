import { ref, watch } from 'vue'
import { useToastStore } from '@/stores'
import { useConnect, useSwitchChain, useAccount, injected } from '@wagmi/vue'
import { NETWORK } from '@/constant'
import { log, parseError } from '@/utils'

export function useWalletChecks() {
  const isProcessing = ref(false)
  const isSuccess = ref(false)

  const { addErrorToast } = useToastStore()
  const { connectAsync, error: connectError } = useConnect()
  const { switchChainAsync } = useSwitchChain()
  const { isConnected } = useAccount()

  watch(connectError, (newConnectError) => {
    if (newConnectError) {
      addErrorToast(parseError(newConnectError))
      log.error('connectError.value', newConnectError)
      resetRefs()
    }
  })

  function resetRefs() {
    isSuccess.value = false
    isProcessing.value = false
  }

  async function performChecks() {
    try {
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
        resetRefs()
        return
      }
    } catch (error) {
      addErrorToast('Failed to validate wallet and network.')
      log.error('performChecks.catch', parseError(error))
      resetRefs()
    }
  }

  return { isProcessing, performChecks, isSuccess, resetRefs }
}

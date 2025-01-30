import { ref, watch } from 'vue'
import { useToastStore } from '@/stores'
import { useConnect, useSwitchChain, useAccount, injected } from '@wagmi/vue'
import { NETWORK } from '@/constant'
import { log } from '@/utils'

export function useWalletChecks() {
  // Refs
  const isProcessing = ref(false)
  const isSuccess = ref(false)

  // Composables
  const { addErrorToast } = useToastStore()
  const { connectAsync, error: connectError } = useConnect()
  const { switchChainAsync, error: switchChainError } = useSwitchChain()
  const { isConnected } = useAccount()

  // Functions
  async function performChecks() {
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
  }

  // Watch
  watch(switchChainError, (newError) => {
    if (newError) {
      addErrorToast(
        newError.name === 'UserRejectedRequestError'
          ? 'Network switch rejected: You need to switch to the correct network to use the CNC Portal'
          : 'Something went wrong: Failed switch network'
      )
      log.error('switchChainError.value', newError)
      isProcessing.value = false
    }
  })

  watch(connectError, (newError) => {
    if (newError) {
      let message = 'Something went wrong: Failed to connect wallet'
      switch (newError.name) {
        case 'UserRejectedRequestError':
          message =
            'Wallet connection rejected: You need to connect your wallet to use the CNC Portal.'
          break
        //@ts-expect-error: not part of type but does show up here at run time
        case 'ProviderNotFoundError':
          message =
            'No wallet detected: You need to install a wallet like metamask to use the CNC Portal'
      }
      addErrorToast(message)
      log.error('connectError.value', newError)
      isProcessing.value = false
    }
  })

  return { isProcessing, performChecks, isSuccess }
}

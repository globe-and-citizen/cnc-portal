import { ref, watch } from 'vue'
import { useToastStore } from '@/stores'
import { useConnect, useSwitchChain, injected, useConnection } from '@wagmi/vue'
import { NETWORK } from '@/constant'
import { log } from '@/utils'

export function useWalletChecks() {
  // Refs
  const isProcessing = ref(false)
  const isSuccess = ref(false)

  // Composables
  const { addErrorToast } = useToastStore()
  const connect = useConnect()
  const connection = useConnection()
  const switchChain = useSwitchChain()
  // const

  // Functions
  async function performChecks() {
    isSuccess.value = false
    isProcessing.value = true
    const networkChainId = parseInt(NETWORK.chainId)

    if (!connection.isConnected.value) {
      connect.mutate({ connector: injected(), chainId: networkChainId })
    }

    switchChain.mutate({ chainId: networkChainId })

    if (connection.isConnected.value) {
      isSuccess.value = true
    } else {
      isProcessing.value = false
      return
    }
  }

  // Watch
  watch(switchChain.error, (newError) => {
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

  watch(connect.error, (newError) => {
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

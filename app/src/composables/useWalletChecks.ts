import { ref, watch } from 'vue'
import { useConnect, useSwitchChain, injected, useConnection } from '@wagmi/vue'
import { NETWORK } from '@/constant'
import { config } from '@/wagmi.config'
import { log } from '@/utils'

export function useWalletChecks() {
  // Refs
  const isProcessing = ref(false)
  const isSuccess = ref(false)

  // Composables
  const toast = useToast()
  const connect = useConnect()
  const connection = useConnection()
  const switchChain = useSwitchChain()

  // Use the pre-registered connector when present (the e2e mock wallet),
  // otherwise fall back to the browser-injected wallet (MetaMask).
  const connector = config.connectors[0] ?? injected()

  // Functions
  async function performChecks() {
    isSuccess.value = false
    isProcessing.value = true
    const networkChainId = parseInt(NETWORK.chainId)

    try {
      if (!connection.isConnected.value) {
        await connect.mutateAsync({ connector, chainId: networkChainId })
      }
      await switchChain.mutateAsync({ chainId: networkChainId })
      isSuccess.value = true
    } catch (error) {
      // connect / switchChain failures are surfaced by the watchers below
      log.error('performChecks error', error)
      isProcessing.value = false
    }
  }

  // Watch
  watch(switchChain.error, (newError) => {
    if (newError) {
      toast.add({
        title:
          newError.name === 'UserRejectedRequestError'
            ? 'Network switch rejected: You need to switch to the correct network to use the CNC Portal'
            : 'Something went wrong: Failed switch network',
        color: 'error'
      })
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
      toast.add({ title: message, color: 'error' })
      log.error('connectError.value', newError)
      isProcessing.value = false
    }
  })

  return { isProcessing, performChecks, isSuccess }
}

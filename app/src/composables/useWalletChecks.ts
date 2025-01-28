import { ref, watch } from 'vue'
import { useToastStore } from '@/stores'
import {
  useConnect,
  useSwitchChain,
  useAccount,
  type Connector,
  type CreateConnectorFn,
  // injected
} from '@wagmi/vue'
import { injected } from '@wagmi/connectors'
import { NETWORK } from '@/constant'
import { log, parseError } from '@/utils'

export function useWalletChecks() {
  const isProcessing = ref(false)
  const isSuccess = ref(false)
  const isConnectRequired = ref(false)

  const { addErrorToast } = useToastStore()
  const { connectors, connect, error: connectError, isPending: isPendingConnect } = useConnect()
  const { switchChain } = useSwitchChain()
  const { isConnected } = useAccount()

  watch(connectError, (newConnectError) => {
    if (newConnectError) {
      addErrorToast(parseError(newConnectError))
      log.error('connectError.value', newConnectError)
      resetRefs()
    }
  })

  watch(isPendingConnect, (newStatus) => {
    if (!newStatus && isConnected.value) {
      isSuccess.value = true
    }
  })

  function resetRefs() {
    isConnectRequired.value = false
    isSuccess.value = false
    isProcessing.value = false
  }

  // async function checkMetaMaskInstalled() {
  //   const metaMaskConnector = connectors.find(
  //     (connector) => connector.name.split(' ')[0] === 'MetaMask'
  //   )

  //   if (!metaMaskConnector) {
  //     resetRefs()
  //     addErrorToast('MetaMask is not installed. Please install MetaMask to continue.')
  //     return
  //   }

  //   return metaMaskConnector
  // }

  async function checkCorrectNetwork(connector: ReturnType<typeof injected>) {
    const networkChainId = parseInt(NETWORK.chainId)

    if (!isConnected.value) {
      isConnectRequired.value = true
      // connect({ connector: metaMaskConnector, chainId: networkChainId })
      connect({ connector, chainId: networkChainId })
    }

    //const currentChainId = await connector.getChainId()

    //if (currentChainId !== networkChainId) {
      switchChain({
        chainId: networkChainId,
        // connector
      })
    //}

    return isConnected.value
  }

  async function performChecks() {
    try {
      isProcessing.value = true

      // const metaMaskConnector = await checkMetaMaskInstalled()
      // if (!metaMaskConnector) {
      //   resetRefs()
      //   return
      // }

      const isNetworkValid = await checkCorrectNetwork(injected())
      if (isConnectRequired.value && !isNetworkValid && !isPendingConnect.value) {
        resetRefs()
        return
      } else if (!isConnectRequired.value && isNetworkValid) isSuccess.value = true
    } catch (error) {
      addErrorToast('Failed to validate wallet and network.')
      log.error('performChecks.catch', parseError(error))
      resetRefs()
    }
  }

  return { isProcessing, performChecks, isSuccess, resetRefs }
}

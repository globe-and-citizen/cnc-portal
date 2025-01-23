import { ref, watch } from 'vue'
import { useToastStore } from '@/stores'
import {
  useConnect,
  useSwitchChain,
  useAccount,
  type Connector,
  type CreateConnectorFn
} from '@wagmi/vue'
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
      addErrorToast('Failed to connect wallet')
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

  async function checkMetaMaskInstalled() {
    const metaMaskConnector = connectors.find(
      (connector) => connector.name.split(' ')[0] === 'MetaMask'
    )

    if (!metaMaskConnector) {
      resetRefs()
      addErrorToast('MetaMask is not installed. Please install MetaMask to continue.')
      return
    }

    return metaMaskConnector
  }

  async function checkCorrectNetwork(metaMaskConnector: Connector<CreateConnectorFn>) {
    const networkChainId = parseInt(NETWORK.chainId)

    if (!isConnected.value) {
      isConnectRequired.value = true
      connect({ connector: metaMaskConnector, chainId: networkChainId })
    }

    const currentChainId = await metaMaskConnector.getChainId()

    if (currentChainId !== networkChainId) {
      switchChain({
        chainId: networkChainId,
        connector: metaMaskConnector
      })
    }

    return isConnected.value
  }

  async function performChecks() {
    try {
      isProcessing.value = true

      const metaMaskConnector = await checkMetaMaskInstalled()
      if (!metaMaskConnector) {
        resetRefs()
        return
      }

      const isNetworkValid = await checkCorrectNetwork(metaMaskConnector)
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

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

  watch(connectError, (newVal) => {
    if (newVal) {
      addErrorToast(parseError(newVal))
      log.error('connectError.value', newVal)
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

  async function validateMetaMask() {
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

  async function validateNetwork(metaMaskConnector: Connector<CreateConnectorFn>) {
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

      const metaMaskConnector = await validateMetaMask()
      if (!metaMaskConnector) {
        resetRefs()
        return
      }

      const networkValid = await validateNetwork(metaMaskConnector)
      if (isConnectRequired.value && !networkValid && !isPendingConnect.value) {
        resetRefs()
        return
      } else if (!isConnectRequired.value && networkValid) isSuccess.value = true
    } catch (error) {
      addErrorToast('Failed to validate wallet and network.')
      log.error('performChecks.catch', parseError(error))
      isProcessing.value = false
    }
  }

  return { isProcessing, performChecks, isSuccess, resetRefs }
}

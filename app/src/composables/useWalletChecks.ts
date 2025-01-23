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
  const { addErrorToast } = useToastStore()
  const { connectors, connect, error: connectError } = useConnect()
  const { switchChain } = useSwitchChain()
  const { isConnected } = useAccount()

  const isProcessing = ref(false)

  watch(connectError, (newVal) => {
    if (newVal) {
      addErrorToast(parseError(newVal))
      log.error('connectError.value', newVal)
      isProcessing.value = false
    }
  })

  async function validateMetaMask() {
    const metaMaskConnector = connectors.find(
      (connector) => connector.name.split(' ')[0] === 'MetaMask'
    )

    if (!metaMaskConnector) {
      addErrorToast('MetaMask is not installed. Please install MetaMask to continue.')
      return false
    }

    return metaMaskConnector
  }

  async function validateNetwork(metaMaskConnector: Connector<CreateConnectorFn>) {
    const networkChainId = parseInt(NETWORK.chainId)

    if (!isConnected.value) {
      connect({ connector: metaMaskConnector, chainId: networkChainId })
    }

    const currentChainId = await metaMaskConnector.getChainId()

    if (currentChainId !== networkChainId) {
      switchChain({
        chainId: networkChainId,
        connector: metaMaskConnector
      })
    }

    return true
  }

  async function performChecks() {
    try {
      isProcessing.value = true

      const metaMaskConnector = await validateMetaMask()
      if (!metaMaskConnector) {
        isProcessing.value = false
        return false
      }

      const networkValid = await validateNetwork(metaMaskConnector)
      if (!networkValid) {
        isProcessing.value = false
        return false
      }

      return true
    } catch (error) {
      addErrorToast('Failed to validate wallet and network.')
      log.error('performChecks.catch', parseError(error))
      isProcessing.value = false
      return false
    }
  }

  return { isProcessing, performChecks }
}

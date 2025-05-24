import Safe from '@safe-global/protocol-kit'
import { ref, watch } from 'vue'
import { formatEther, type Address, type Chain } from 'viem'
import { log, parseError } from '@/utils'
import { hardhat, mainnet, polygon, sepolia } from 'viem/chains'
import { currentChainId, MULTI_SEND_ADDRESS, MULTI_SEND_CALL_ONLY_ADDRESS } from '@/constant'
import type { PredictSafeAddressProps } from 'node_modules/@safe-global/protocol-kit/dist/src/contracts/utils'
import { getBlock, waitForTransactionReceipt } from 'viem/actions'
import { config } from '@/wagmi.config'
import { useTeamStore, useToastStore } from '@/stores'
import { useSendTransaction } from '@wagmi/vue'

const chainToNetwork: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
  137: polygon,
  31337: hardhat // use sepolia forking
}

const safeSdkInstance = ref<Safe | null>(null)
const isInitializing = ref<boolean>(false)

export function useDeploySafe() {
  const isLoading = ref<boolean>(false)
  const address = ref<Address | undefined>(undefined)
  const isSuccess = ref<boolean>(false)
  const error = ref<unknown>(undefined)
  const toastStore = useToastStore()
  const { sendTransactionAsync, data } = useSendTransaction()

  async function execute(owners: Address[], threshold: number) {
    try {
      isLoading.value = true
      const safe = await Safe.init({
        provider: chainToNetwork[currentChainId].rpcUrls.default.http[0],
        predictedSafe: await predictedSafe(owners, threshold)
      })

      address.value = await safe.getAddress()
      const deploymentTransaction = await safe.createSafeDeploymentTransaction()

      await sendTransactionAsync({
        to: deploymentTransaction.to,
        value: BigInt(deploymentTransaction.value),
        data: deploymentTransaction.data as `0x${string}`
      })

      if (data.value) {
        await waitForTransactionReceipt(config.getClient(), {
          hash: data.value
        })
      }
      isSuccess.value = true
    } catch (err) {
      log.error(parseError(err))
      address.value = undefined
      error.value
    } finally {
      isLoading.value = false
    }
  }

  async function predictedSafe(
    owners: Address[],
    threshold: number
  ): Promise<PredictSafeAddressProps> {
    return {
      safeAccountConfig: {
        owners,
        threshold
      },
      safeDeploymentConfig: {
        saltNonce: (await getBlock(config.getClient())).number.toString()
      }
    } as PredictSafeAddressProps
  }

  watch(error, (newVal) => {
    if (newVal) {
      toastStore.addErrorToast('Failed to deploy safe wallet')
    }
  })

  return {
    execute,
    address,
    isLoading,
    isSuccess,
    error
  }
}

export function useSafe() {
  const isLoadingBalance = ref<boolean>(false)
  const balance = ref<string | undefined>(undefined)
  const errorBalance = ref<unknown>(undefined)
  const toastStore = useToastStore()
  const teamStore = useTeamStore()
  const address = teamStore.currentTeam?.teamContracts.find(
    (contract) => contract.type == 'SafeWallet'
  )?.address

  async function _initializeSafeSDK(addressToInit: Address): Promise<Safe | null> {
    // If an instance for the current address already exists, return it
    if (safeSdkInstance.value && (await safeSdkInstance.value.getAddress()) === addressToInit) {
      // @ts-ignore
      return safeSdkInstance.value
    }

    // If already initializing, wait for it to complete (simple lock)
    if (isInitializing.value) {
      // This is a simple way to wait; a more robust solution might use a promise queue
      await new Promise((resolve) => setTimeout(resolve, 100))
      return _initializeSafeSDK(addressToInit) // Retry after a short delay
    }

    isInitializing.value = true

    try {
      const newSdkInstance = await Safe.init({
        safeAddress: addressToInit,
        provider: chainToNetwork[currentChainId].rpcUrls.default.http[0],
        contractNetworks: {
          [hardhat.id]: {
            multiSendAddress: MULTI_SEND_ADDRESS,
            multiSendCallOnlyAddress: MULTI_SEND_CALL_ONLY_ADDRESS
          }
        }
      })

      safeSdkInstance.value = newSdkInstance
      console.log('Safe SDK Initialized successfully.')
      return newSdkInstance
    } catch (err) {
      console.error('Safe SDK Initialization failed:', err)
      safeSdkInstance.value = null // Clear instance on failure
      return null
    } finally {
      isInitializing.value = false
    }
  }

  async function getBalance() {
    try {
      isLoadingBalance.value = false
      const sdk = await _initializeSafeSDK(address!)
      if (!sdk) {
        throw Error('SDK not initialized.')
      }

      balance.value = formatEther(await sdk.getBalance())
    } catch (error) {
      toastStore.addErrorToast('Fetching safe wallet balance fails.')
      errorBalance.value = error
    } finally {
      isLoadingBalance.value = false
    }
  }

  async function proposeTransaction() {}

  return { getBalance, balance, isLoadingBalance, errorBalance }
}

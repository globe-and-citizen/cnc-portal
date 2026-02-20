import { ref, onUnmounted } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { writeContract, waitForTransactionReceipt, getConnections } from '@wagmi/core'
import { encodeFunctionData, type Address, type Hex, type WatchContractEventReturnType } from 'viem'
import { watchContractEvent } from 'viem/actions'
import { useToastStore } from '@/stores'
import { config } from '@/wagmi.config'
import { log, parseError } from '@/utils'
import {
  validateBeaconAddresses,
  getBeaconConfigs,
  getDeploymentConfigs,
  handleBeaconProxyCreatedLogs
} from '@/utils/contractDeploymentUtil'
import { OFFICER_BEACON, validateAddresses } from '@/constant'
import { OFFICER_ABI } from '@/artifacts/abi/officer'
import { FACTORY_BEACON_ABI } from '@/artifacts/abi/factory-beacon'
console.log('OFFICER_BEACON:', OFFICER_BEACON)

export interface OfficerDeploymentOptions {
  investorInput: {
    name: string
    symbol: string
  }
  onDeploymentComplete?: (officerAddress: Address) => void | Promise<void>
}

export interface OfficerDeploymentResult {
  hash: Hex
  receipt: unknown
}

/**
 * Composable for deploying Officer contracts with all sub-contracts
 * Uses wagmi core + Tanstack Query for optimal performance
 */
export function useOfficerDeployment() {
  const { addSuccessToast, addErrorToast } = useToastStore()
  const queryClient = useQueryClient()

  // State for deployed contract address and transaction hash
  const deployedOfficerAddress = ref<Address | null>(null)
  const transactionHash = ref<Hex | null>(null)

  // Event watcher cleanup
  let unwatchEvent: WatchContractEventReturnType | null = null

  /**
   * Mutation for deploying Officer contract
   */
  const {
    mutateAsync: deployOfficerContract,
    isPending: isDeploying,
    isSuccess: isConfirmed,
    error: deploymentError,
    data: deploymentResult
  } = useMutation<OfficerDeploymentResult, Error, OfficerDeploymentOptions>({
    mutationKey: ['deployOfficerContract'],
    mutationFn: async (options: OfficerDeploymentOptions) => {
      // Get current connections
      const connections = getConnections(config)
      const currentConnection = connections.find((c) => c.accounts.length > 0)
      const address = currentConnection?.accounts[0]

      if (!address) {
        throw new Error('Wallet not connected')
      }

      // Validate addresses
      validateAddresses()

      // Validate beacon addresses
      validateBeaconAddresses()

      // Verify Officer Beacon address
      if (!OFFICER_BEACON) {
        throw new Error('Officer Beacon address is not defined')
      }

      // Get configurations
      const beaconConfigs = getBeaconConfigs()
      const deployments = getDeploymentConfigs(address, options.investorInput)

      // Encode initialization function
      const encodedFunction = encodeFunctionData({
        abi: OFFICER_ABI,
        functionName: 'initialize',
        args: [address, beaconConfigs, deployments, true]
      })

      // Deploy Officer contract using wagmi core
      const hash = await writeContract(config, {
        address: OFFICER_BEACON,
        abi: FACTORY_BEACON_ABI,
        functionName: 'createBeaconProxy',
        args: [encodedFunction]
      })

      log.info('Officer contract deployment transaction sent:', hash)
      transactionHash.value = hash

      // Wait for transaction confirmation
      const receipt = await waitForTransactionReceipt(config, { hash })

      log.info('Officer contract deployment confirmed:', receipt)

      return { hash, receipt }
    },
    onSuccess: () => {
      addSuccessToast('Officer contract deployed successfully')
      log.info('Officer contract deployment successful')
    },
    onError: (error) => {
      log.error('Officer deployment error:', error)
      const errorMessage = parseError(error, FACTORY_BEACON_ABI)
      addErrorToast(`Failed to deploy officer contract: ${errorMessage}`)
    }
  })

  /**
   * Invalidate queries after successful deployment
   */
  const invalidateQueries = async (teamId?: string | number) => {
    try {
      // Invalidate team queries
      if (teamId) {
        const numericTeamId = typeof teamId === 'string' ? parseInt(teamId, 10) : teamId
        await queryClient.invalidateQueries({ queryKey: ['team', numericTeamId] })
        await queryClient.invalidateQueries({ queryKey: ['teams'] })
      }

      // Invalidate contract queries
      await queryClient.invalidateQueries({ queryKey: ['contracts'] })

      log.info('Queries invalidated after officer deployment')
    } catch (error) {
      log.warn('Failed to invalidate queries:', error)
    }
  }

  /**
   * Watch for BeaconProxyCreated event to get the deployed contract address
   * Uses viem's watchContractEvent directly with wagmi config
   */
  const watchDeploymentEvent = (onSuccess: (proxyAddress: Address) => void | Promise<void>) => {
    if (!OFFICER_BEACON) {
      log.error('Officer Beacon address not available for watching events')
      return
    }

    // Get the public client from wagmi config
    const publicClient = config.getClient()

    // Watch for BeaconProxyCreated events using viem
    unwatchEvent = watchContractEvent(publicClient, {
      address: OFFICER_BEACON as Address,
      abi: FACTORY_BEACON_ABI,
      eventName: 'BeaconProxyCreated',
      onLogs: async (logs) => {
        log.info('BeaconProxyCreated event received')

        // Get current connections to get address
        const connections = getConnections(config)
        const currentConnection = connections.find((c) => c.accounts.length > 0)
        const address = currentConnection?.accounts[0]

        if (!address) {
          log.error('Current address not available')
          return
        }

        // Use utility function to handle logs
        const proxyAddress = handleBeaconProxyCreatedLogs(
          logs,
          transactionHash.value as Hex | undefined,
          address
        )

        if (!proxyAddress) {
          addErrorToast('Failed to process contract deployment event')
          return
        }

        log.info('Officer proxy address:', proxyAddress)
        deployedOfficerAddress.value = proxyAddress

        // Call success callback
        try {
          await onSuccess(proxyAddress)
        } catch (error) {
          log.error('Error in deployment success callback:', error)
          addErrorToast('Failed to complete post-deployment actions')
        }
      }
    })
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (unwatchEvent) {
      unwatchEvent()
      unwatchEvent = null
    }
  })

  return {
    // State
    isLoading: isDeploying,
    isDeploying,
    isConfirmed,
    error: deploymentError,
    deployedOfficerAddress,
    transactionHash,
    deploymentResult,

    // Methods
    deployOfficerContract,
    watchDeploymentEvent,
    invalidateQueries
  }
}

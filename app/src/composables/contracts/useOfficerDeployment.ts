import { ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { writeContract, waitForTransactionReceipt, getConnections } from '@wagmi/core'
import { encodeFunctionData, type Address, type Hex } from 'viem'
import { getLogs } from 'viem/actions'
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
  teamId?: string | number
  onDeploymentComplete?: (officerAddress: Address) => void | Promise<void>
}

export interface OfficerDeploymentResult {
  hash: Hex
  receipt: unknown
  officerAddress: Address
}

/**
 * Composable for deploying Officer contracts with all sub-contracts
 * Uses wagmi core + Tanstack Query for optimal performance
 */
export function useOfficerDeployment() {
  const { addSuccessToast, addErrorToast } = useToastStore()
  const queryClient = useQueryClient()

  const deployedOfficerAddress = ref<Address | null>(null)
  const transactionHash = ref<Hex | null>(null)

  const {
    mutateAsync: deployOfficerContract,
    isPending: isDeploying,
    isSuccess: isConfirmed,
    error: deploymentError,
    data: deploymentResult
  } = useMutation<OfficerDeploymentResult, Error, OfficerDeploymentOptions>({
    mutationKey: ['deployOfficerContract'],
    mutationFn: async (options: OfficerDeploymentOptions) => {
      const connections = getConnections(config)
      const currentConnection = connections.find((c) => c.accounts.length > 0)
      const address = currentConnection?.accounts[0]

      if (!address) {
        throw new Error('Wallet not connected')
      }

      validateAddresses()
      validateBeaconAddresses()

      if (!OFFICER_BEACON) {
        throw new Error('Officer Beacon address is not defined')
      }

      const beaconConfigs = getBeaconConfigs()
      const deployments = getDeploymentConfigs(address, options.investorInput)

      const encodedFunction = encodeFunctionData({
        abi: OFFICER_ABI,
        functionName: 'initialize',
        args: [address, beaconConfigs, deployments, true] as const
      })

      const hash = await writeContract(config, {
        address: OFFICER_BEACON,
        abi: FACTORY_BEACON_ABI,
        functionName: 'createBeaconProxy',
        args: [encodedFunction]
      })

      log.info('Officer contract deployment transaction sent:', hash)
      transactionHash.value = hash

      const receipt = await waitForTransactionReceipt(config, { hash })
      log.info('Officer contract deployment confirmed:', receipt)

      const publicClient = config.getClient()
      const blockNumber = receipt.blockNumber

      const logs = await getLogs(publicClient, {
        address: OFFICER_BEACON as Address,
        event: {
          type: 'event',
          name: 'BeaconProxyCreated',
          inputs: [
            { type: 'address', name: 'proxy', indexed: true },
            { type: 'address', name: 'deployer', indexed: true }
          ]
        },
        fromBlock: blockNumber,
        toBlock: blockNumber
      })

      const proxyAddress = handleBeaconProxyCreatedLogs(logs, hash, address)

      if (!proxyAddress) {
        throw new Error('Failed to extract Officer proxy address from deployment event')
      }

      log.info('Officer proxy address extracted:', proxyAddress)
      deployedOfficerAddress.value = proxyAddress

      return { hash, receipt, officerAddress: proxyAddress }
    },
    onSuccess: async (data, variables) => {
      addSuccessToast('Officer contract deployed successfully')
      log.info('Officer contract deployment successful')

      //  Execute callback once, with proper error handling
      if (variables.onDeploymentComplete) {
        try {
          await variables.onDeploymentComplete(data.officerAddress)
          log.info('Post-deployment callback completed successfully')
        } catch (error) {
          // Log error but don't throw - deployment was successful
          log.error('Error in deployment success callback:', error)
          // Only show user-facing error, don't fail the entire deployment
          addErrorToast('Deployment successful, but setup encountered an issue')
        }
      }

      // Auto-invalidate queries
      if (variables.teamId) {
        const numericTeamId =
          typeof variables.teamId === 'string' ? parseInt(variables.teamId, 10) : variables.teamId

        await queryClient.invalidateQueries({ queryKey: ['team', numericTeamId] })
        await queryClient.invalidateQueries({ queryKey: ['teams'] })
      }

      await queryClient.invalidateQueries({ queryKey: ['contracts'] })
      log.info('Queries invalidated after officer deployment')
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
    invalidateQueries
  }
}

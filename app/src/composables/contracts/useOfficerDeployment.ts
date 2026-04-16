import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { writeContract, waitForTransactionReceipt, getConnections } from '@wagmi/core'
import { encodeFunctionData, type Address, type Hex } from 'viem'
import { getLogs } from 'viem/actions'
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

export interface OfficerDeploymentMetadata {
  officerAddress: Address
  deployBlockNumber: number
  deployedAt: Date
}

export interface DeployOfficerArgs {
  investorInput: {
    name: string
    symbol: string
  }
  /**
   * Optional team id; when provided, the {@link useDeployOfficer} composable
   * invalidates the matching team query on success.
   */
  teamId?: string | number
}

export interface OfficerDeploymentResult {
  hash: Hex
  receipt: unknown
  officerAddress: Address
  deployBlockNumber: number
  deployedAt: Date
}

/**
 * Deploys a new Officer BeaconProxy with all its sub-contracts and returns
 * the on-chain deployment metadata. Pure async — no Vue state, no toasts,
 * no query invalidation. Call directly for raw control, or use
 * {@link useDeployOfficer} to get TanStack-managed state + side effects.
 */
export async function deployOfficer(args: DeployOfficerArgs): Promise<OfficerDeploymentResult> {
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
  const deployments = getDeploymentConfigs(address, args.investorInput)

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

  return {
    hash,
    receipt,
    officerAddress: proxyAddress,
    deployBlockNumber: Number(blockNumber),
    deployedAt: new Date()
  }
}

/**
 * TanStack-wrapped variant of {@link deployOfficer}. Exposes `mutateAsync`,
 * `isPending`, `error`, `data`. On success shows a toast and invalidates the
 * related team / contracts queries; on error shows a decoded error toast.
 */
export function useDeployOfficer() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<OfficerDeploymentResult, Error, DeployOfficerArgs>({
    mutationKey: ['deployOfficer'],
    mutationFn: deployOfficer,
    onSuccess: async (_data, variables) => {
      toast.add({ title: 'Officer contract deployed successfully', color: 'success' })
      log.info('Officer contract deployment successful')

      if (variables.teamId !== undefined) {
        const numericTeamId =
          typeof variables.teamId === 'string' ? parseInt(variables.teamId, 10) : variables.teamId
        await queryClient.invalidateQueries({ queryKey: ['team', numericTeamId] })
        await queryClient.invalidateQueries({ queryKey: ['teams'] })
      }
      await queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: (error) => {
      log.error('Officer deployment error:', error)
      const errorMessage = parseError(error, FACTORY_BEACON_ABI)
      toast.add({ title: `Failed to deploy officer contract: ${errorMessage}`, color: 'error' })
    }
  })
}

/**
 * Invalidates team / teams / contracts queries. Exposed so orchestration
 * composables can flush caches after a multi-step flow finishes (e.g. after
 * a post-deploy shareholder migration succeeds).
 */
export function useInvalidateOfficerQueries() {
  const queryClient = useQueryClient()
  return async (teamId?: string | number) => {
    if (teamId !== undefined) {
      const numericTeamId = typeof teamId === 'string' ? parseInt(teamId, 10) : teamId
      await queryClient.invalidateQueries({ queryKey: ['team', numericTeamId] })
      await queryClient.invalidateQueries({ queryKey: ['teams'] })
    }
    await queryClient.invalidateQueries({ queryKey: ['contracts'] })
  }
}

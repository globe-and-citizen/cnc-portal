/**
 * Side-effect contract (see app/src/composables/CONVENTIONS.md):
 *   - onSuccess: toasts "Officer contract deployed successfully" and
 *                invalidates `teamKeys.all` + `contractKeys.all`.
 *   - onError:   no toast — `mutation.error` is left for callers to render
 *                inline via UAlert / classifyError.
 *   - Invalidation: only the keys this deploy actually mutates (team list
 *                and contracts list). Team detail is covered transitively
 *                via `teamKeys.all`. Do NOT add narrower per-team keys here
 *                — they belong to whatever step actually changes team data.
 *   - Options:   pass `skipInvalidation` / `silent` when composing inside
 *                an orchestrator that owns the flow-level toast + final
 *                cache flush (see `useOfficerRedeploy`).
 */
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { getConnections } from '@wagmi/core'
import { encodeFunctionData, parseEventLogs, type Address, type Hex } from 'viem'
import { config } from '@/wagmi.config'
import { log, parseError } from '@/utils'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'
import { teamKeys } from '@/queries/team.queries'
import { contractKeys } from '@/queries/contract.queries'
import {
  validateBeaconAddresses,
  getBeaconConfigs,
  getDeploymentConfigs
} from '@/utils/contractDeploymentUtil'
import { OFFICER_BEACON, validateAddresses } from '@/constant'
import { OFFICER_ABI } from '@/artifacts/abi/officer'
import { FACTORY_BEACON_ABI } from '@/artifacts/abi/factory-beacon'

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

  const { hash, receipt } = await executeContractWrite({
    address: OFFICER_BEACON,
    abi: FACTORY_BEACON_ABI,
    functionName: 'createBeaconProxy',
    args: [encodedFunction]
  })

  log.info('Officer contract deployment confirmed:', { hash, receipt })

  // The deployment receipt already carries every log emitted by this exact
  // transaction, so we decode the BeaconProxyCreated event straight from it
  // instead of issuing a second `getLogs` RPC over the whole block (which
  // could also surface proxies created by other txs in the same block).
  const [event] = parseEventLogs({
    abi: [
      {
        type: 'event',
        name: 'BeaconProxyCreated',
        inputs: [
          { type: 'address', name: 'proxy', indexed: true },
          { type: 'address', name: 'deployer', indexed: true }
        ]
      }
    ] as const,
    eventName: 'BeaconProxyCreated',
    logs: receipt.logs
  })

  if (!event) {
    throw new Error('Failed to extract Officer proxy address from deployment event')
  }

  const proxyAddress = event.args.proxy

  log.info('Officer proxy address extracted:', proxyAddress)

  return {
    hash,
    receipt,
    officerAddress: proxyAddress,
    deployBlockNumber: Number(receipt.blockNumber),
    deployedAt: new Date()
  }
}

export interface UseDeployOfficerOptions {
  /**
   * When true, suppress the default "Officer contract deployed successfully"
   * toast. Set this when composing inside an orchestrator that emits its own
   * flow-level success toast.
   */
  silent?: boolean
  /**
   * When true, skip the default `teamKeys.all` + `contractKeys.all`
   * invalidation. Set this when an orchestrator owns the final cache flush
   * for the whole workflow.
   */
  skipInvalidation?: boolean
}

/**
 * TanStack-wrapped variant of {@link deployOfficer}. Exposes `mutateAsync`,
 * `isPending`, `error`, `data`. On success shows a toast and invalidates the
 * related team / contracts queries. Errors are left on `mutation.error` so
 * the consumer can render them inline (e.g. via UAlert) — no default error
 * toast, since reactive error display is preferred for in-flow feedback.
 */
export function useDeployOfficer(options: UseDeployOfficerOptions = {}) {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<OfficerDeploymentResult, Error, DeployOfficerArgs>({
    mutationKey: ['deployOfficer'],
    mutationFn: deployOfficer,
    onSuccess: async () => {
      if (!options.silent) {
        toast.add({ title: 'Officer contract deployed successfully', color: 'success' })
      }
      log.info('Officer contract deployment successful')

      if (!options.skipInvalidation) {
        await queryClient.invalidateQueries({ queryKey: teamKeys.all })
        await queryClient.invalidateQueries({ queryKey: contractKeys.all })
      }
    },
    onError: (error) => {
      log.error('Officer deployment error:', error)
    }
  })
}

/**
 * Decodes an error from a deploy attempt into a human-readable message.
 * Templates use this when rendering `deployMutation.error.value` to show the
 * parsed ABI revert reason rather than the raw blockchain error.
 */
export function formatDeployError(error: unknown): string {
  return parseError(error, FACTORY_BEACON_ABI)
}

/**
 * Invalidates teams + contracts queries. Exposed so orchestration composables
 * can flush caches after a multi-step flow finishes (e.g. after a post-deploy
 * shareholder migration succeeds).
 *
 * Uses key-factory prefixes (`teamKeys.all`, `contractKeys.all`) so every
 * registered query under those namespaces refetches — including team detail
 * via the `teamKeys.detail(...)` prefix relationship.
 */
export function useInvalidateOfficerQueries() {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: teamKeys.all })
    await queryClient.invalidateQueries({ queryKey: contractKeys.all })
  }
}

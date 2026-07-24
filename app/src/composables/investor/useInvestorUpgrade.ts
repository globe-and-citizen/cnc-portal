/**
 * Side-effect contract (see app/src/composables/CONVENTIONS.md):
 *   - This is an ORCHESTRATOR composable. It owns the flow-level success
 *     toast and the final cache flush, mirroring `useOfficerRedeploy` but
 *     WITHOUT touching the rest of the team's contract suite: it registers +
 *     deploys only the `Investor` beacon on the team's EXISTING Officer
 *     (`configureBeacon` + `deployBeaconProxy`, both callable post-init —
 *     see Officer.sol), then runs the same Merkle migration as a full
 *     redeploy would. Bank/Voting/Proposals/etc. are never redeployed.
 *   - Errors: NEVER toast from here. Each mutation's `error` ref plus
 *     `workflowError` are exposed for reactive rendering (UAlert).
 *   - Workflow state: `pendingMigration` and `workflowError` are the only
 *     manual refs — everything else is derived from the child mutations.
 */
import { computed, ref } from 'vue'
import { encodeFunctionData, parseEventLogs, zeroAddress, type Address } from 'viem'
import { useMutation } from '@tanstack/vue-query'
import { useTeamStore } from '@/stores'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'
import { useInvestorV2Address } from '@/composables/investor/readsV2'
import { useInvestorAddress } from '@/composables/investor/reads'
import {
  useMigrateShareholders,
  type MigrateShareholdersResult
} from '@/composables/investor/useShareholderMigration'
import { useSyncContractsMutation } from '@/queries/contract.queries'
import { OFFICER_ABI } from '@/artifacts/abi/officer'
import { INVESTOR_V2_ABI } from '@/artifacts/abi/investorV2'
import { INVESTOR_BEACON_ADDRESS } from '@/constant'
import { log } from '@/utils'

export interface UpgradeShareTokenArgs {
  name: string
  symbol: string
}

const CONTRACT_DEPLOYED_EVENT_ABI = [
  {
    type: 'event',
    name: 'ContractDeployed',
    inputs: [
      { type: 'string', name: 'contractType' },
      { type: 'address', name: 'deployedAddress' }
    ]
  }
] as const

/**
 * Registers the `Investor` beacon on the team's existing Officer and deploys
 * the proxy — two separate transactions, since `configureBeacon` must land
 * before `deployBeaconProxy` can resolve it. Pure async — no Vue state.
 */
export async function deployInvestorV2Proxy(
  officerAddress: Address,
  args: UpgradeShareTokenArgs
): Promise<Address> {
  if (!INVESTOR_BEACON_ADDRESS) {
    throw new Error('Investor beacon address is not defined')
  }

  await executeContractWrite({
    address: officerAddress,
    abi: OFFICER_ABI,
    functionName: 'configureBeacon',
    args: ['Investor', INVESTOR_BEACON_ADDRESS]
  })

  const initializerData = encodeFunctionData({
    abi: INVESTOR_V2_ABI,
    functionName: 'initialize',
    args: [args.name, args.symbol, zeroAddress]
  })

  const { receipt } = await executeContractWrite({
    address: officerAddress,
    abi: OFFICER_ABI,
    functionName: 'deployBeaconProxy',
    args: ['Investor', initializerData]
  })

  const [event] = parseEventLogs({
    abi: CONTRACT_DEPLOYED_EVENT_ABI,
    eventName: 'ContractDeployed',
    logs: receipt.logs
  })

  if (!event) {
    throw new Error('Failed to extract the new Investor address from the deployBeaconProxy event')
  }

  return event.args.deployedAddress
}

export function useDeployInvestorV2Proxy() {
  return useMutation({
    mutationKey: ['deployInvestorV2Proxy'],
    mutationFn: (args: { officerAddress: Address } & UpgradeShareTokenArgs) =>
      deployInvestorV2Proxy(args.officerAddress, args)
  })
}

/**
 * Orchestrates "upgrade this team's share token in place": deploy the
 * Investor (v2) proxy on the existing Officer, sync the new TeamContract row,
 * then commit the Merkle migration root from the old InvestorV1. Unlike
 * `useOfficerRedeploy`, no new Officer is created and no other sub-contract
 * is touched.
 */
export function useInvestorUpgrade() {
  const teamStore = useTeamStore()
  const toast = useToast()

  const oldInvestorAddress = useInvestorAddress()
  const newInvestorAddress = useInvestorV2Address()

  const deployMutation = useDeployInvestorV2Proxy()
  const syncMutation = useSyncContractsMutation()
  const migrateMutation = useMigrateShareholders({ silent: true })

  const workflowError = ref<Error | null>(null)
  const isRunning = computed(
    () =>
      deployMutation.isPending.value ||
      syncMutation.isPending.value ||
      migrateMutation.isPending.value
  )

  /** True once a team can offer this upgrade: has InvestorV1, no Investor yet. */
  const canUpgrade = computed(() => !!oldInvestorAddress.value && !newInvestorAddress.value)

  const reset = () => {
    workflowError.value = null
    deployMutation.reset()
    syncMutation.reset()
    migrateMutation.reset()
  }

  const upgrade = async (args: UpgradeShareTokenArgs): Promise<void> => {
    const teamId = teamStore.currentTeamId
    const officerAddress = teamStore.currentTeamMeta.data?.currentOfficer?.address
    if (!teamId || !officerAddress) return
    reset()

    const deployedAddress = await deployMutation.mutateAsync({ officerAddress, ...args })
    if (!deployedAddress) return

    const syncResult = await syncMutation.mutateAsync({ body: { teamId } })
    if (syncResult === undefined) {
      log.error('Failed to sync the new Investor contract into the backend')
      workflowError.value = new Error(
        'Investor deployed, but syncing it with the backend failed. Refresh the page and retry from the Share Token page.'
      )
      return
    }

    const migrateResult: MigrateShareholdersResult = await migrateMutation.mutateAsync({
      teamId,
      previousOfficerAddress: officerAddress,
      newInvestorAddress: deployedAddress
    })

    if (migrateResult.kind === 'done') {
      toast.add({
        title: `Share token upgraded — migration root set for ${migrateResult.migratedCount} shareholder${migrateResult.migratedCount === 1 ? '' : 's'}`,
        color: 'success'
      })
    } else if (migrateResult.kind === 'noop-empty') {
      toast.add({
        title: 'Share token upgraded — no previous shareholders to migrate',
        color: 'info'
      })
    }
  }

  return {
    upgrade,
    reset,
    canUpgrade,
    isRunning,
    deployError: deployMutation.error,
    syncError: syncMutation.error,
    migrationError: migrateMutation.error,
    workflowError
  }
}

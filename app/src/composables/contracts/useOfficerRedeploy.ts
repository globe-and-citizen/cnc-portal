/**
 * Side-effect contract (see app/src/composables/CONVENTIONS.md):
 *   - This is an ORCHESTRATOR composable. It owns the flow-level success
 *     toast ("Officer redeployed and contracts synced") and the final
 *     cache flush. The wrappers it composes are configured to stay silent
 *     and skip their own invalidation so the user sees exactly one toast
 *     and one refetch wave for the whole redeploy.
 *   - Errors: NEVER toast from here. Each mutation's `error` ref plus
 *     `workflowError` are exposed for reactive rendering (UAlert).
 *   - Workflow state: `pendingMigration` and `workflowError` are the only
 *     manual refs — everything else is derived from the three mutations.
 */
import { computed, ref } from 'vue'
import { readContract } from '@wagmi/core'
import type { Address } from 'viem'
import { config } from '@/wagmi.config'
import { useToast } from '@nuxt/ui/composables'
import { useTeamStore } from '@/stores'
import {
  useDeployOfficer,
  useInvalidateOfficerQueries
} from '@/composables/contracts/useOfficerDeployment'
import { useSetMigrationRootMutation } from '@/composables/investor/useSetMigrationRoot'
import { useGenerateMerkleSnapshotMutation } from '@/queries/investorMigration.queries'
import { useCreateOfficerMutation } from '@/queries/contract.queries'
import { OFFICER_ABI } from '@/artifacts/abi/officer'
import { log } from '@/utils'

/**
 * Orchestrates the full "redeploy Officer" lifecycle: deploy on-chain,
 * register in the backend, then migrate shareholders from the previous
 * InvestorV1. The migration step is retriable — if it fails we hold the
 * addresses in `pendingMigration` so the caller can drive a retry UI.
 *
 * All async operations delegate to TanStack mutations (`useDeployOfficer`,
 * `useCreateOfficerMutation`, `useMigrateShareholders`), so their own
 * loading/error state lives in TanStack — this composable only owns the
 * higher-level workflow state that spans multiple calls.
 *
 * Errors are **not** surfaced via toast from here. Each mutation's `error`
 * ref is exposed as-is plus a workflow-level `workflowError` for things that
 * don't belong to any single mutation (e.g. "new InvestorV1 not found in
 * getTeam()"). The consumer template is expected to render them via reactive
 * UAlert components.
 */
export function useOfficerRedeploy() {
  const teamStore = useTeamStore()
  const toast = useToast()

  // Silence the wrappers' own success toasts and cache flushes so the
  // orchestrator owns a single flow-level toast and a single end-of-flow
  // invalidation pass — see CONVENTIONS.md §1 / §2.
  const deployMutation = useDeployOfficer({ silent: true, skipInvalidation: true })
  const registerMutation = useCreateOfficerMutation()
  const generateSnapshotMutation = useGenerateMerkleSnapshotMutation()
  const migrateMutation = useSetMigrationRootMutation({ silent: true })
  const invalidateQueries = useInvalidateOfficerQueries()

  // Workflow-level state that spans multiple mutations.
  const pendingMigration = ref<{
    teamId: string | number
    previousOfficerAddress: Address
    previousInvestorAddress: Address
    newInvestorAddress: Address
  } | null>(null)
  // Workflow-level error that doesn't map to any single mutation (e.g. the
  // on-chain lookup that runs between register and migrate).
  const workflowError = ref<Error | null>(null)

  const isRunning = computed(
    () =>
      deployMutation.isPending.value ||
      registerMutation.isPending.value ||
      generateSnapshotMutation.isPending.value ||
      migrateMutation.isPending.value
  )
  const migrationFailed = computed(
    () => pendingMigration.value !== null && !migrateMutation.isPending.value
  )

  const findInvestorAddress = async (officerAddress: Address): Promise<Address | null> => {
    const contracts = (await readContract(config, {
      address: officerAddress,
      abi: OFFICER_ABI,
      functionName: 'getTeam'
    })) as readonly { contractType: string; contractAddress: Address }[]
    return contracts.find((c) => c.contractType === 'Investor')?.contractAddress ?? null
  }

  const tryMigration = async (ctx: {
    teamId: string | number
    previousOfficerAddress: Address
    previousInvestorAddress: Address
    newInvestorAddress: Address
  }) => {
    // Step 1: Generate Merkle snapshot from previous Investor v1
    const snapshot = await generateSnapshotMutation.mutateAsync({
      body: { investorV1Address: ctx.previousInvestorAddress }
    })
    if (!snapshot) return

    // Step 2: Write root to new Investor v2 contract
    await migrateMutation.mutateAsync({
      investorV2Address: ctx.newInvestorAddress,
      root: snapshot.root as any,
      shareholderCount: snapshot.shareholders.length
    })
    if (migrateMutation.isSuccess.value) {
      pendingMigration.value = null
    }
  }

  const retryMigration = async () => {
    if (pendingMigration.value) {
      await tryMigration(pendingMigration.value)
      if (!pendingMigration.value) {
        await invalidateQueries()
        toast.add({ title: 'Shareholders migrated successfully', color: 'success' })
      }
    }
  }

  const skipMigration = async () => {
    pendingMigration.value = null
    migrateMutation.reset()
    await invalidateQueries()
    toast.add({
      title:
        'Migration skipped. You can retry it later from the Share Token page (Migrate from previous Officer).',
      color: 'warning'
    })
  }

  const reset = () => {
    pendingMigration.value = null
    workflowError.value = null
    deployMutation.reset()
    registerMutation.reset()
    generateSnapshotMutation.reset()
    migrateMutation.reset()
  }

  const redeploy = async (investorInput: { name: string; symbol: string }) => {
    const teamId = teamStore.currentTeamId
    if (!teamId) return
    reset()

    // Errors remain on deployMutation.error / registerMutation.error so the
    // template can render them reactively. `` just aborts
    // the sequence without leaking a rejection.
    const metadata = await deployMutation.mutateAsync({ investorInput, teamId })
    if (!metadata) return

    const registerResult = await registerMutation.mutateAsync({
      body: {
        teamId,
        address: metadata.officerAddress,
        deployBlockNumber: metadata.deployBlockNumber,
        deployedAt: metadata.deployedAt.toISOString()
      }
    })

    if (!registerResult) return

    const { previousOfficer } = registerResult

    if (previousOfficer) {
      const previousInvestorAddress = await findInvestorAddress(previousOfficer.address as Address)
      if (!previousInvestorAddress) {
        log.error('Previous Investor address not found in Officer.getTeam()')
        workflowError.value = new Error(
          'Could not locate previous Investor contract. Retry from the Share Token page.'
        )
        return
      }

      const newInvestorAddress = await findInvestorAddress(metadata.officerAddress)
      if (!newInvestorAddress) {
        log.error('New Investor address not found in Officer.getTeam()')
        workflowError.value = new Error(
          'Officer redeployed, but the new Investor could not be located in Officer.getTeam(). Retry from the Share Token page.'
        )
        return
      }
      pendingMigration.value = {
        teamId,
        previousOfficerAddress: previousOfficer.address as Address,
        previousInvestorAddress,
        newInvestorAddress
      }
      await tryMigration(pendingMigration.value)
      if (pendingMigration.value) return
    }

    await invalidateQueries()
    toast.add({ title: 'Officer redeployed and contracts synced', color: 'success' })
  }

  return {
    // Actions
    redeploy,
    retryMigration,
    skipMigration,
    reset,

    // State
    isRunning,
    migrationFailed,

    // Reactive errors — bind directly to UAlert in the template
    deployError: deployMutation.error,
    registerError: registerMutation.error,
    generateSnapshotError: generateSnapshotMutation.error,
    migrationError: migrateMutation.error,
    workflowError
  }
}

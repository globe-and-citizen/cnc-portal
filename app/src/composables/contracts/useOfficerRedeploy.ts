/**
 * Side-effect contract (see app/src/composables/CONVENTIONS.md):
 *   - This is an ORCHESTRATOR composable. It owns the flow-level success
 *     toast ("Officer redeployed and contracts synced") and the final
 *     cache flush. The wrappers it composes are configured to stay silent
 *     and skip their own invalidation so the user sees exactly one toast
 *     and one refetch wave for the whole redeploy.
 *   - Errors: NEVER toast from here. `failure` identifies a failed deploy,
 *     registration, or workflow step. `migrationRecovery` describes the
 *     separate retry-or-skip state after a migration failure.
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
import { useMigrateShareholders } from '@/composables/investor/useShareholderMigration'
import { useCreateOfficerMutation } from '@/queries/contract.queries'
import { officerAbi } from '@/artifacts/abi/generated'
import { log } from '@/utils'

export type OfficerRedeployFailureStage = 'deploy' | 'registration' | 'workflow'

/** One redeployment step failed before shareholder migration could complete. */
export interface OfficerRedeployFailure {
  stage: OfficerRedeployFailureStage
  error: Error
}

/** A deployed Officer needs its shareholder migration retried or skipped. */
export interface OfficerRedeployMigrationRecovery {
  error: Error | null
}

/**
 * Orchestrates the full "redeploy Officer" lifecycle: deploy on-chain,
 * register in the backend, then migrate shareholders from the previous
 * Officer's share token. The migration step is retriable — if it fails we hold the
 * addresses in `pendingMigration` so the caller can drive a retry UI.
 *
 * All async operations delegate to TanStack mutations (`useDeployOfficer`,
 * `useCreateOfficerMutation`, `useMigrateShareholders`), so their own
 * loading/error state lives in TanStack — this composable only owns the
 * higher-level workflow state that spans multiple calls.
 *
 * Errors are **not** surfaced via toast from here. `failure` combines a
 * failed workflow stage with its error, while `migrationRecovery` represents
 * the separate retry-or-skip decision after deployment completed. The consumer
 * template renders those reactive states with the appropriate UAlert.
 */
export function useOfficerRedeploy() {
  const teamStore = useTeamStore()
  const toast = useToast()

  // Silence the wrappers' own success toasts and cache flushes so the
  // orchestrator owns a single flow-level toast and a single end-of-flow
  // invalidation pass — see CONVENTIONS.md §1 / §2.
  const deployMutation = useDeployOfficer({ silent: true, skipInvalidation: true })
  const registerMutation = useCreateOfficerMutation()
  const migrateMutation = useMigrateShareholders({ silent: true })
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
      migrateMutation.isPending.value
  )
  const failure = computed<OfficerRedeployFailure | null>(() => {
    if (deployMutation.error.value) return { stage: 'deploy', error: deployMutation.error.value }
    if (registerMutation.error.value)
      return { stage: 'registration', error: registerMutation.error.value }
    if (workflowError.value) return { stage: 'workflow', error: workflowError.value }
    return null
  })

  const migrationRecovery = computed<OfficerRedeployMigrationRecovery | null>(() => {
    if (!pendingMigration.value || migrateMutation.isPending.value) return null
    return { error: migrateMutation.error.value }
  })

  const findInvestorAddress = async (officerAddress: Address): Promise<Address | null> => {
    const contracts = (await readContract(config, {
      address: officerAddress,
      abi: officerAbi,
      functionName: 'getTeam'
    })) as readonly { contractType: string; contractAddress: Address }[]
    return contracts.find((c) => c.contractType === 'Investor')?.contractAddress ?? null
  }

  const findPreviousInvestorAddress = async (officerAddress: Address): Promise<Address | null> => {
    const contracts = (await readContract(config, {
      address: officerAddress,
      abi: officerAbi,
      functionName: 'getTeam'
    })) as readonly { contractType: string; contractAddress: Address }[]
    // The previous Officer may be any generation: every legacy one (V0/V0.1/V1)
    // registers its share token as 'InvestorV1', current ones as 'Investor'.
    return (
      contracts.find((c) => c.contractType === 'Investor' || c.contractType === 'InvestorV1')
        ?.contractAddress ?? null
    )
  }

  const tryMigration = async (ctx: {
    teamId: string | number
    previousOfficerAddress: Address
    previousInvestorAddress: Address
    newInvestorAddress: Address
  }) => {
    try {
      const result = await migrateMutation.mutateAsync({
        teamId: ctx.teamId,
        previousOfficerAddress: ctx.previousOfficerAddress,
        newInvestorAddress: ctx.newInvestorAddress
      })

      if (result) {
        // A no-op is a valid terminal state: there are no holders to migrate
        // or the root was already committed.
        pendingMigration.value = null
      }
    } catch {
      // Keep pendingMigration so the modal can expose retry/skip controls.
      // The child mutation owns the concrete error ref rendered by the UI.
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
    migrateMutation.reset()
  }

  const redeploy = async (investorInput: { name: string; symbol: string }) => {
    const teamId = teamStore.currentTeamId
    if (!teamId) return
    reset()

    // Errors remain on deployMutation.error / registerMutation.error so the
    // template can render them reactively. A falsy result just aborts the
    // sequence without leaking a rejection.
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
      const previousInvestorAddress = await findPreviousInvestorAddress(
        previousOfficer.address as Address
      )
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
    failure,
    migrationRecovery
  }
}

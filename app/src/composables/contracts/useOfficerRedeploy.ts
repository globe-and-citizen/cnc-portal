import { computed, ref } from 'vue'
import { readContract } from '@wagmi/core'
import type { Address } from 'viem'
import { config } from '@/wagmi.config'
import { useTeamStore } from '@/stores'
import {
  useDeployOfficer,
  useInvalidateOfficerQueries
} from '@/composables/contracts/useOfficerDeployment'
import {
  useMigrateShareholders,
  InconsistentSupplyError
} from '@/composables/investor/useShareholderMigration'
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
 */
export function useOfficerRedeploy() {
  const teamStore = useTeamStore()
  const toast = useToast()

  const deployMutation = useDeployOfficer()
  const registerMutation = useCreateOfficerMutation()
  const migrateMutation = useMigrateShareholders()
  const invalidateQueries = useInvalidateOfficerQueries()

  // Workflow-level state that spans multiple mutations. Not provided by any
  // single TanStack mutation, so kept as local refs.
  const pendingMigration = ref<{
    previousOfficerAddress: Address
    newInvestorAddress: Address
  } | null>(null)

  const isRunning = computed(
    () =>
      deployMutation.isPending.value ||
      registerMutation.isPending.value ||
      migrateMutation.isPending.value
  )
  const migrationFailed = computed(
    () => pendingMigration.value !== null && !migrateMutation.isPending.value
  )
  const migrationError = computed(() => migrateMutation.error.value)
  const isInconsistent = computed(
    () => migrateMutation.error.value instanceof InconsistentSupplyError
  )

  const findNewInvestorAddress = async (
    officerAddress: Address
  ): Promise<Address | null> => {
    const contracts = (await readContract(config, {
      address: officerAddress,
      abi: OFFICER_ABI,
      functionName: 'getTeam'
    })) as readonly { contractType: string; contractAddress: Address }[]
    return contracts.find((c) => c.contractType === 'InvestorV1')?.contractAddress ?? null
  }

  const tryMigration = async (ctx: {
    previousOfficerAddress: Address
    newInvestorAddress: Address
  }) => {
    // Outcome toasts come from useMigrateShareholders default onSuccess.
    // Errors remain on migrateMutation.error for the caller's retry UI.
    // We await so the orchestrator can sequence the next step, but swallow
    // rejection — the workflow decides what to do next by reading state.
    await migrateMutation.mutateAsync(ctx).catch(() => null)
    if (migrateMutation.isSuccess.value) {
      pendingMigration.value = null
    }
  }

  const retryMigration = async () => {
    if (pendingMigration.value) {
      await tryMigration(pendingMigration.value)
      if (!pendingMigration.value) {
        const teamId = teamStore.currentTeamId
        if (teamId) await invalidateQueries(teamId)
      }
    }
  }

  const skipMigration = async () => {
    const teamId = teamStore.currentTeamId
    pendingMigration.value = null
    migrateMutation.reset()
    if (teamId) await invalidateQueries(teamId)
    toast.add({
      title:
        'Migration skipped. You can retry it later from the Share Token page (Migrate from previous Officer).',
      color: 'warning'
    })
  }

  const reset = () => {
    pendingMigration.value = null
    migrateMutation.reset()
  }

  const redeploy = async (investorInput: { name: string; symbol: string }) => {
    const teamId = teamStore.currentTeamId
    if (!teamId) return
    reset()

    // Error toast handled by useDeployOfficer onError. A .catch(() => null)
    // lets us abort the sequence cleanly without wrapping in try/catch.
    const metadata = await deployMutation
      .mutateAsync({ investorInput, teamId })
      .catch(() => null)
    if (!metadata) return

    const registerResult = await registerMutation
      .mutateAsync({
        body: {
          teamId,
          address: metadata.officerAddress,
          deployBlockNumber: metadata.deployBlockNumber,
          deployedAt: metadata.deployedAt.toISOString()
        }
      })
      .catch((error) => {
        log.error('Error registering redeployed officer:', error)
        toast.add({ title: 'Failed to register the new Officer contract', color: 'error' })
        return null
      })
    if (!registerResult) return

    const { previousOfficer } = registerResult

    if (previousOfficer) {
      const newInvestorAddress = await findNewInvestorAddress(metadata.officerAddress)
      if (!newInvestorAddress) {
        log.error('New InvestorV1 address not found in Officer.getTeam()')
        toast.add({
          title:
            'Officer redeployed, but the new InvestorV1 could not be located. Retry from the Share Token page.',
          color: 'error'
        })
      } else {
        pendingMigration.value = {
          previousOfficerAddress: previousOfficer.address as Address,
          newInvestorAddress
        }
        await tryMigration(pendingMigration.value)
        if (pendingMigration.value) return
      }
    }

    await invalidateQueries(teamId)
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
    migrationError,
    isInconsistent
  }
}

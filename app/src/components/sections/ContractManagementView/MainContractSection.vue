<template>
  <div class="flex flex-col gap-6">
    <div v-if="teamStore.currentTeamMeta.isPending" class="flex justify-center">
      <UIcon name="i-lucide-loader-circle" class="text-primary h-10 w-10 animate-spin" />
    </div>
    <div
      v-if="!teamStore.currentTeamMeta.isPending && teamStore"
      class="flex w-full flex-col items-center gap-5"
    >
      <UCard class="w-full">
        <template #header>
          <div class="flex items-center justify-between">
            <span>Main contract</span>
            <div>
              <UModal
                v-if="showModal"
                v-model:open="showModal"
                title="Redeploy Officer Contract"
                description="Deploy a new Officer contract for this team. The previous Officer is archived, not deleted."
              >
                <template #body>
                  <UAlert
                    color="warning"
                    variant="soft"
                    icon="i-heroicons-exclamation-triangle"
                    title="Read this before continuing"
                    class="my-6"
                  />

                  <div class="mb-6 space-y-4 text-sm">
                    <UAlert color="warning" variant="soft" title="What happens">
                      <template #description>
                        <ul class="list-inside list-disc space-y-1">
                          <li v-for="(item, i) in whatHappensItems" :key="i" v-html="item" />
                        </ul>
                      </template>
                    </UAlert>

                    <UAlert color="error" variant="soft" title="What you will lose access to">
                      <template #description>
                        <ul class="list-inside list-disc space-y-1">
                          <li v-for="(item, i) in whatYouLoseItems" :key="i" v-html="item" />
                        </ul>
                      </template>
                    </UAlert>
                  </div>

                  <UAlert
                    v-if="shareholderCount > 0"
                    color="info"
                    variant="soft"
                    icon="i-heroicons-information-circle"
                    :title="`${shareholderCount} shareholder${shareholderCount === 1 ? '' : 's'} will be migrated automatically`"
                    class="mb-6"
                  >
                    <template #description>
                      After the new Officer is deployed, the current share token holders will be
                      reissued the same balances on the new Investor contract via
                      <code>distributeMint</code>. This is a separate transaction you'll need to
                      sign right after the deploy.
                    </template>
                  </UAlert>

                  <UForm :state="investorContractInput" class="mb-6 flex flex-col gap-4">
                    <UFormField
                      label="New share token name"
                      name="name"
                      required
                      help="Full name of the new share token (e.g. Company SHER)"
                    >
                      <UInput
                        v-model="investorContractInput.name"
                        placeholder="Company SHER"
                        class="w-full"
                        data-test="redeploy-share-name-input"
                      />
                    </UFormField>
                    <UFormField
                      label="New symbol"
                      name="symbol"
                      required
                      help="Short ticker symbol (e.g. SHR, COMP)"
                    >
                      <UInput
                        v-model="investorContractInput.symbol"
                        placeholder="SHR"
                        class="w-full"
                        data-test="redeploy-share-symbol-input"
                      />
                    </UFormField>
                  </UForm>

                  <div
                    v-if="migrationFailed"
                    class="border-error bg-error/5 mb-4 rounded-lg border p-4 text-sm"
                    data-test="migration-error-block"
                  >
                    <p class="text-error font-semibold">Shareholder migration failed</p>
                    <p class="mt-1">
                      The new Officer is deployed and registered, but the shareholder mint did
                      not complete. You can retry below, or skip and finish the migration later
                      from the Share Token page.
                    </p>
                    <p v-if="migrationError" class="mt-2 font-mono text-xs opacity-70">
                      {{ migrationError.message }}
                    </p>
                    <p v-if="migrationStatus === 'blocked-inconsistent'" class="text-error mt-2">
                      Retry is blocked: the new InvestorV1 already has a totalSupply that does
                      not match the previous shareholders. Migrating again would double-mint.
                    </p>
                  </div>

                  <div class="flex justify-between gap-3">
                    <UButton
                      color="secondary"
                      :disabled="isRedeploying"
                      @click="migrationFailed ? skipMigration() : (showModal = false)"
                      data-test="cancel-redeploy-contracts"
                    >
                      {{ migrationFailed ? 'Skip & close' : 'Cancel' }}
                    </UButton>
                    <UButton
                      v-if="migrationFailed"
                      color="primary"
                      :loading="isRedeploying"
                      :disabled="isRedeploying || migrationStatus === 'blocked-inconsistent'"
                      @click="retryMigration()"
                      data-test="retry-migration"
                    >
                      Retry shareholder migration
                    </UButton>
                    <UButton
                      v-else
                      color="primary"
                      :loading="isRedeploying"
                      :disabled="!canRedeploy || isRedeploying"
                      @click="redeployContracts()"
                      data-test="confirm-redeploy-contracts"
                    >
                      Redeploy Officer
                    </UButton>
                  </div>
                </template>
              </UModal>
              <UButton
                color="primary"
                :disabled="teamStore.currentTeam?.ownerAddress !== userStore.address"
                @click="openRedeployModal"
                data-test="createAddCampaign"
              >
                Redeploy Contracts
              </UButton>
            </div>
          </div>
        </template>
        <MainContractTable />
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { readContract } from '@wagmi/core'
import type { Address } from 'viem'
import { config } from '@/wagmi.config'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'
import MainContractTable from './MainContractTable.vue'
import { useOfficerDeployment } from '@/composables/contracts'
import type { OfficerDeploymentMetadata } from '@/composables/contracts/useOfficerDeployment'
import {
  useInvestorName,
  useInvestorSymbol,
  useInvestorShareholders
} from '@/composables/investor/reads'
import { useShareholderMigration } from '@/composables/investor/useShareholderMigration'
import { useCreateOfficerMutation } from '@/queries/contract.queries'
import { OFFICER_ABI } from '@/artifacts/abi/officer'
import { log } from '@/utils'

interface Shareholder {
  shareholder: Address
  amount: bigint
}

const showModal = ref(false)
const investorContractInput = ref({ name: '', symbol: '' })

const whatHappensItems = [
  'A brand-new Officer contract is deployed on-chain, along with fresh sub-contracts (Bank, Voting, Board of Directors, Expense Account, Cash Remuneration, Investor / Share token).',
  "The previous Officer and its sub-contracts are <strong>archived</strong>: their database rows stay in place, linked to the old Officer, and remain visible in the team's contract history.",
  'Your <strong>Safe contract is preserved</strong> — it is not affected by this operation.'
]

const whatYouLoseItems = [
  "Funds held in the <strong>old</strong> Bank, Expense Account and Cash Remuneration contracts are still on-chain but are no longer reachable through the new Officer's UI. Withdraw or migrate them first if you need them.",
  'Existing share tokens issued by the old Investor contract remain valid on-chain but the new Investor contract starts from zero. Token holders must be redistributed manually.',
  'Voting and Board of Directors history attached to the old Officer remains visible in the archive but is not carried over.'
]

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const toast = useToast()

const { data: currentInvestorName } = useInvestorName()
const { data: currentInvestorSymbol } = useInvestorSymbol()
const { data: currentShareholders } = useInvestorShareholders()

const {
  isLoading: isDeploying,
  deployOfficerContract: deployOfficer,
  invalidateQueries
} = useOfficerDeployment()
const { mutateAsync: registerOfficer, isPending: isRegistering } = useCreateOfficerMutation()
const {
  migrate: runMigration,
  reset: resetMigration,
  status: migrationStatus,
  error: migrationError,
  isRunning: isMigrating
} = useShareholderMigration()

// When register succeeds but the mint fails (or reverts, or user rejects the
// second wallet popup), we keep the addresses around so the modal can offer a
// one-click retry without re-deploying the Officer.
const pendingMigration = ref<{
  previousOfficerAddress: Address
  newInvestorAddress: Address
} | null>(null)

const isRedeploying = computed(
  () => isDeploying.value || isRegistering.value || isMigrating.value
)

const migrationFailed = computed(() => pendingMigration.value !== null && !isMigrating.value)

const shareholderCount = computed(() => {
  const list = currentShareholders.value as readonly Shareholder[] | undefined
  return list?.length ?? 0
})

const canRedeploy = computed(
  () =>
    !!investorContractInput.value.name.trim() && !!investorContractInput.value.symbol.trim()
)

// Prefill the form with the current on-chain values whenever the modal opens
// or the underlying reads resolve. Users can still override before redeploying.
const prefillFromChain = () => {
  if (typeof currentInvestorName.value === 'string') {
    investorContractInput.value.name = currentInvestorName.value
  }
  if (typeof currentInvestorSymbol.value === 'string') {
    investorContractInput.value.symbol = currentInvestorSymbol.value
  }
}

watch([currentInvestorName, currentInvestorSymbol], prefillFromChain)

const openRedeployModal = () => {
  prefillFromChain()
  showModal.value = true
}

// Resolves the InvestorV1 sub-contract address off the given Officer via
// getTeam(). Used to find the new InvestorV1 right after deploy, before the
// team store has been refreshed.
const findNewInvestorAddress = async (officerAddress: Address): Promise<Address | null> => {
  const contracts = (await readContract(config, {
    address: officerAddress,
    abi: OFFICER_ABI,
    functionName: 'getTeam'
  })) as readonly { contractType: string; contractAddress: Address }[]
  return contracts.find((c) => c.contractType === 'InvestorV1')?.contractAddress ?? null
}

// Runs the migration with the pending addresses. Used by both the automatic
// post-redeploy attempt and the inline retry button. Clears pendingMigration
// on success (or on terminal noop states) so the modal closes cleanly.
const runPendingMigration = async (ctx: {
  previousOfficerAddress: Address
  newInvestorAddress: Address
}) => {
  try {
    const result = await runMigration(ctx)
    if (result.status === 'done') {
      toast.add({
        title: `Migrated ${result.migratedCount} shareholder${result.migratedCount === 1 ? '' : 's'}`,
        color: 'success'
      })
    } else if (result.status === 'noop-already-migrated') {
      toast.add({ title: 'Shareholders were already migrated', color: 'success' })
    } else if (result.status === 'noop-empty') {
      toast.add({ title: 'No shareholders to migrate', color: 'info' })
    }
    pendingMigration.value = null
  } catch {
    // Error is surfaced via migrationStatus/migrationError; keep modal open
    // so the user can retry. Intentionally swallowed here — no rethrow.
  }
}

const retryMigration = () => {
  if (pendingMigration.value) {
    runPendingMigration(pendingMigration.value)
  }
}

const skipMigration = async () => {
  const teamId = teamStore.currentTeamId
  pendingMigration.value = null
  resetMigration()
  if (teamId) await invalidateQueries(teamId)
  toast.add({
    title:
      'Migration skipped. You can retry it later from the Share Token page (Migrate from previous Officer).',
    color: 'warning'
  })
  showModal.value = false
}

const handleRedeploySuccess = async (metadata: OfficerDeploymentMetadata) => {
  const teamId = teamStore.currentTeamId
  if (!teamId) return

  try {
    const { previousOfficer } = await registerOfficer({
      body: {
        teamId,
        address: metadata.officerAddress,
        deployBlockNumber: metadata.deployBlockNumber,
        deployedAt: metadata.deployedAt.toISOString()
      }
    })

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
        await runPendingMigration(pendingMigration.value)
        // If the migration threw, pendingMigration stays set and the modal
        // renders the retry/skip UI. Don't invalidate or close in that case —
        // we want the user to make a choice first.
        if (pendingMigration.value) return
      }
    }

    await invalidateQueries(teamId)
    toast.add({ title: 'Officer redeployed and contracts synced', color: 'success' })
    showModal.value = false
  } catch (error) {
    log.error('Error registering redeployed officer:', error)
    toast.add({ title: 'Failed to register the new Officer contract', color: 'error' })
  }
}

const redeployContracts = async () => {
  if (!canRedeploy.value || !teamStore.currentTeamId) return
  resetMigration()
  pendingMigration.value = null
  await deployOfficer({
    investorInput: { ...investorContractInput.value },
    teamId: teamStore.currentTeamId,
    onDeploymentComplete: handleRedeploySuccess
  })
}
</script>

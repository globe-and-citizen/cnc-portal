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

                  <div class="flex justify-between gap-3">
                    <UButton
                      color="secondary"
                      :disabled="isRedeploying"
                      @click="showModal = false"
                      data-test="cancel-redeploy-contracts"
                    >
                      Cancel
                    </UButton>
                    <UButton
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
import { writeContract, waitForTransactionReceipt, readContract } from '@wagmi/core'
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
import { useCreateOfficerMutation } from '@/queries/contract.queries'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { OFFICER_ABI } from '@/artifacts/abi/officer'
import { log } from '@/utils'

interface ShareholderSnapshot {
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

const isMigratingShareholders = ref(false)

const {
  isLoading: isDeploying,
  deployOfficerContract: deployOfficer,
  invalidateQueries
} = useOfficerDeployment()
const { mutateAsync: registerOfficer, isPending: isRegistering } = useCreateOfficerMutation()

const isRedeploying = computed(
  () => isDeploying.value || isRegistering.value || isMigratingShareholders.value
)

const shareholderCount = computed(() => {
  const list = currentShareholders.value as readonly ShareholderSnapshot[] | undefined
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

// Given an Officer address, returns the InvestorV1 sub-contract address from
// its getTeam() list. Used both to find the old Investor (on the previous
// Officer) and the new one (on the freshly deployed Officer).
const findInvestorAddress = async (officerAddress: Address): Promise<Address | null> => {
  const contracts = (await readContract(config, {
    address: officerAddress,
    abi: OFFICER_ABI,
    functionName: 'getTeam'
  })) as readonly { contractType: string; contractAddress: Address }[]

  return contracts.find((c) => c.contractType === 'InvestorV1')?.contractAddress ?? null
}

// Reads the live shareholder list from an old InvestorV1 contract. Because we
// find the old Investor via the on-chain linked list (previousOfficer → old
// Officer → old InvestorV1), this is durable across page refreshes — no JS
// snapshot involved.
const readOldShareholders = async (
  oldInvestorAddress: Address
): Promise<readonly ShareholderSnapshot[]> => {
  const result = (await readContract(config, {
    address: oldInvestorAddress,
    abi: INVESTOR_ABI,
    functionName: 'getShareholders'
  })) as readonly ShareholderSnapshot[]
  return result
}

const migrateShareholders = async (
  newInvestorAddress: Address,
  snapshot: readonly ShareholderSnapshot[]
) => {
  isMigratingShareholders.value = true
  try {
    const hash = await writeContract(config, {
      address: newInvestorAddress,
      abi: INVESTOR_ABI,
      functionName: 'distributeMint',
      args: [snapshot.map((s) => ({ shareholder: s.shareholder, amount: s.amount }))]
    })
    await waitForTransactionReceipt(config, { hash })
    toast.add({
      title: `Migrated ${snapshot.length} shareholder${snapshot.length === 1 ? '' : 's'}`,
      color: 'success'
    })
  } finally {
    isMigratingShareholders.value = false
  }
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

    // Shareholder migration: read the live set off the old InvestorV1 (found
    // via the previousOfficer the backend just linked for us) and reissue it
    // on the new one. Skipped if this is the team's first Officer.
    if (previousOfficer) {
      try {
        const oldInvestorAddress = await findInvestorAddress(previousOfficer.address as Address)
        if (oldInvestorAddress) {
          const shareholders = await readOldShareholders(oldInvestorAddress)
          if (shareholders.length > 0) {
            const newInvestorAddress = await findInvestorAddress(metadata.officerAddress)
            if (!newInvestorAddress) {
              throw new Error('New InvestorV1 address not found in Officer.getTeam()')
            }
            await migrateShareholders(newInvestorAddress, shareholders)
          }
        }
      } catch (migrationError) {
        // Officer is already registered; the linked list persists, so the
        // migration can be retried later from the new InvestorV1.
        log.error('Shareholder migration failed:', migrationError)
        toast.add({
          title:
            'Officer redeployed, but shareholder migration failed. You can retry it later from the new InvestorV1 contract.',
          color: 'error'
        })
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

  // No JS snapshot needed — the backend response gives us previousOfficer and
  // we read the live shareholder list off the old InvestorV1 after deploy.
  await deployOfficer({
    investorInput: { ...investorContractInput.value },
    teamId: teamStore.currentTeamId,
    onDeploymentComplete: handleRedeploySuccess
  })
}
</script>

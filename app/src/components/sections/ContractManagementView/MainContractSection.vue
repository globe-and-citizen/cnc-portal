<template>
  <div class="flex flex-col gap-6">
    <span
      v-if="teamStore.currentTeamMeta.isPending"
      class="loading loading-spinner loading-lg"
    ></span>
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
                  <div class="alert alert-warning my-6">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-6 w-6 shrink-0 stroke-current"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span class="text-base font-semibold">Read this before continuing</span>
                  </div>

                  <div class="mb-6 space-y-4 text-sm">
                    <div class="border-warning bg-warning/5 rounded-lg border p-4">
                      <h4 class="mb-2 font-semibold">What happens</h4>
                      <ul class="list-inside list-disc space-y-1">
                        <li>
                          A brand-new Officer contract is deployed on-chain, along with fresh
                          sub-contracts (Bank, Voting, Board of Directors, Expense Account, Cash
                          Remuneration, Investor / Share token).
                        </li>
                        <li>
                          The previous Officer and its sub-contracts are
                          <strong>archived</strong>: their database rows stay in place, linked to
                          the old Officer, and remain visible in the team's contract history.
                        </li>
                        <li>
                          Your <strong>Safe contract is preserved</strong> — it is not affected by
                          this operation.
                        </li>
                      </ul>
                    </div>

                    <div class="border-error bg-error/5 rounded-lg border p-4">
                      <h4 class="text-error mb-2 font-semibold">What you will lose access to</h4>
                      <ul class="list-inside list-disc space-y-1">
                        <li>
                          Funds held in the <strong>old</strong> Bank, Expense Account and Cash
                          Remuneration contracts are still on-chain but are no longer reachable
                          through the new Officer's UI. Withdraw or migrate them first if you need
                          them.
                        </li>
                        <li>
                          Existing share tokens issued by the old Investor contract remain valid
                          on-chain but the new Investor contract starts from zero. Token holders
                          must be redistributed manually.
                        </li>
                        <li>
                          Voting and Board of Directors history attached to the old Officer remains
                          visible in the archive but is not carried over.
                        </li>
                      </ul>
                    </div>
                  </div>

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
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'
import MainContractTable from './MainContractTable.vue'
import { useOfficerDeployment } from '@/composables/contracts'
import type { OfficerDeploymentMetadata } from '@/composables/contracts/useOfficerDeployment'
import { useInvestorName, useInvestorSymbol } from '@/composables/investor/reads'
import { useCreateOfficerMutation } from '@/queries/contract.queries'
import { log } from '@/utils'

const showModal = ref(false)
const investorContractInput = ref({ name: '', symbol: '' })

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const toast = useToast()

const { data: currentInvestorName } = useInvestorName()
const { data: currentInvestorSymbol } = useInvestorSymbol()

const {
  isLoading: isDeploying,
  deployOfficerContract: deployOfficer,
  invalidateQueries
} = useOfficerDeployment()
const { mutateAsync: registerOfficer, isPending: isRegistering } = useCreateOfficerMutation()

const isRedeploying = computed(() => isDeploying.value || isRegistering.value)

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

const handleRedeploySuccess = async (metadata: OfficerDeploymentMetadata) => {
  const teamId = teamStore.currentTeamId
  if (!teamId) return

  try {
    await registerOfficer({
      body: {
        teamId,
        address: metadata.officerAddress,
        deployBlockNumber: metadata.deployBlockNumber,
        deployedAt: metadata.deployedAt.toISOString()
      }
    })

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

  await deployOfficer({
    investorInput: { ...investorContractInput.value },
    teamId: teamStore.currentTeamId,
    onDeploymentComplete: handleRedeploySuccess
  })
}
</script>

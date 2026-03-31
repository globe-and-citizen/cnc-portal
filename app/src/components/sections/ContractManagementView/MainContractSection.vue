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
              <!-- <p>
                You have created your team, but the necessary smart contracts for its management
                haven't been deployed yet. Click
                <UButton size="sm" color="primary" outline @click="showModal = true"
                  >here</UButton>
                >
                to proceed with the deployment.
              </p> -->
              <UModal
                v-if="showModal"
                v-model:open="showModal"
                title="Remove Deployed Contracts"
                description="Warning: this action will delete contract state and all funds. Use this only for redeployment testing."
              >
                <template #body>
                  <!-- Warning for contract redeployment -->
                  <!-- <div class="mt-6"> -->
                  <div class="alert alert-error my-6">
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
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span class="text-lg font-bold">⚠️ DANGER - IRREVERSIBLE ACTION</span>
                  </div>

                  <div class="mb-6">
                    <h3 class="text-error mb-4 text-lg font-bold">
                      Redeploying contracts will cause PERMANENT DATA LOSS:
                    </h3>

                    <div class="space-y-4 text-sm">
                      <!-- Cryptocurrency Loss -->
                      <div class="border-error bg-error/5 rounded-lg border p-4">
                        <div class="mb-2 flex items-start gap-2">
                          <span class="text-error text-lg font-bold">💰</span>
                          <h4 class="text-error text-base font-bold">Cryptocurrency Loss</h4>
                        </div>
                        <div class="ml-8">
                          <p class="mb-2"><strong>Affected Contracts:</strong></p>
                          <ul class="mb-3 list-inside list-disc space-y-1 text-xs">
                            <li>Bank Contract</li>
                            <li>Expense Account Contract (EIP712)</li>
                            <li>Cash Remuneration Contract (EIP712)</li>
                          </ul>
                          <p class="text-sm">
                            <strong>Loss Description:</strong> All cryptocurrency funds stored in
                            these contracts will be PERMANENTLY LOST and unrecoverable. Any ETH,
                            tokens, or other digital assets will be inaccessible forever.
                          </p>
                        </div>
                      </div>

                      <!-- Share Tokens Loss -->
                      <div class="border-error bg-error/5 rounded-lg border p-4">
                        <div class="mb-2 flex items-start gap-2">
                          <span class="text-error text-lg font-bold">🪙</span>
                          <h4 class="text-error text-base font-bold">Share Tokens Loss</h4>
                        </div>
                        <div class="ml-8">
                          <p class="mb-2"><strong>Affected Contracts:</strong></p>
                          <ul class="mb-3 list-inside list-disc space-y-1 text-xs">
                            <li>Investor Contract (V1) / Share Token Contract</li>
                          </ul>
                          <p class="text-sm">
                            <strong>Loss Description:</strong> All existing share token holders will
                            permanently lose their tokens. Ownership records, voting power, and
                            dividend rights will be erased. Token distribution must be completely
                            redone from scratch.
                          </p>
                        </div>
                      </div>

                      <!-- Governance Data Loss -->
                      <div class="border-error bg-error/5 rounded-lg border p-4">
                        <div class="mb-2 flex items-start gap-2">
                          <span class="text-error text-lg font-bold">🗳️</span>
                          <h4 class="text-error text-base font-bold">Governance Data Loss</h4>
                        </div>
                        <div class="ml-8">
                          <p class="mb-2"><strong>Affected Contracts:</strong></p>
                          <ul class="mb-3 list-inside list-disc space-y-1 text-xs">
                            <li>Board of Directors Contract</li>
                            <li>Voting Contract</li>
                            <li>Officer Contract</li>
                          </ul>
                          <p class="text-sm">
                            <strong>Loss Description:</strong> Complete deletion of election
                            history, voting records, current Board of Directors composition, and all
                            governance decisions. The entire democratic structure and its history
                            will be permanently erased.
                          </p>
                        </div>
                      </div>

                      <!-- Database Reset -->
                      <div class="border-error bg-error/5 rounded-lg border p-4">
                        <div class="mb-2 flex items-start gap-2">
                          <span class="text-error text-lg font-bold">🗄️</span>
                          <h4 class="text-error text-base font-bold">Team Contract Reset</h4>
                        </div>
                        <div class="ml-8">
                          <p class="mb-2"><strong>Affected Systems:</strong></p>
                          <ul class="mb-3 list-inside list-disc space-y-1 text-xs">
                            <li>Team Officer Contract</li>
                            <li>Team Contracts will be removed</li>
                          </ul>
                          <p class="text-sm">
                            <strong>Loss Description:</strong> Here Only Team Contract related data
                            will be deleted, requiring complete redeployment and reconfiguration.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div class="bg-base-200 mt-4 rounded-lg p-4">
                      <p class="text-sm font-medium">
                        <strong>Note:</strong> This action cannot be undone. Ensure all stakeholders
                        are informed and that you have documented all important contract addresses
                        and configurations before proceeding.
                      </p>
                    </div>
                  </div>

                  <div class="flex justify-between gap-3">
                    <UButton
                      color="secondary"
                      @click="showModal = false"
                      data-test="cancel-redeploy-contracts"
                    >
                      Cancel
                    </UButton>
                    <UButton
                      color="error"
                      @click="redeployContracts()"
                      data-test="confirm-redeploy-contracts"
                    >
                      I Understand - Proceed with Redeployment
                    </UButton>
                  </div>
                  <!-- </div> -->
                </template>
              </UModal>
              <UButton
                color="primary"
                :disabled="teamStore.currentTeam?.ownerAddress !== userStore.address"
                @click="showModal = true"
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
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'
import MainContractTable from './MainContractTable.vue'
import { ref } from 'vue'
import { useResetContractsMutation } from '@/queries/contract.queries'
import { useRouter } from 'vue-router'

const showModal = ref(false)

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const router = useRouter()

const { mutateAsync: resetContracts } = useResetContractsMutation()

const redeployContracts = async () => {
  if (teamStore.currentTeamId) {
    await resetContracts({ body: { teamId: teamStore.currentTeamId } })
  }
  showModal.value = false
  // redirect to team page
  await router.push({ name: 'show-team', params: { id: teamStore.currentTeamId } })
}
</script>

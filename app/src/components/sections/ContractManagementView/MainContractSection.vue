<template>
  <div class="flex flex-col gap-6">
    <span
      v-if="teamStore.currentTeamMeta.teamIsFetching"
      class="loading loading-spinner loading-lg"
    ></span>
    <div
      v-if="!teamStore.currentTeamMeta.teamIsFetching && teamStore"
      class="flex flex-col gap-5 w-full items-center"
    >
      <CardComponent class="w-full" title="Main contract">
        <template #card-action>
          <div>
            <!-- <p>
              You have created your team, but the necessary smart contracts for its management
              haven't been deployed yet. Click
              <ButtonUI size="sm" variant="primary" outline @click="showModal = true"
                >here</ButtonUI
              >
              to proceed with the deployment.
            </p> -->
            <ModalComponent v-model="showModal" v-if="showModal">
              <!-- Warning for contract redeployment -->
              <!-- <div class="mt-6"> -->
              <h4 class="font-bold text-lg">Remove Deployed Contracts</h4>
              <div class="alert alert-error my-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="stroke-current shrink-0 h-6 w-6"
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
                <span class="font-bold text-lg">⚠️ DANGER - IRREVERSIBLE ACTION</span>
              </div>

              <div class="mb-6">
                <h3 class="text-lg font-bold text-error mb-4">
                  Redeploying contracts will cause PERMANENT DATA LOSS:
                </h3>

                <div class="space-y-4 text-sm">
                  <!-- Cryptocurrency Loss -->
                  <div class="border border-error rounded-lg p-4 bg-error/5">
                    <div class="flex items-start gap-2 mb-2">
                      <span class="text-error font-bold text-lg">💰</span>
                      <h4 class="font-bold text-error text-base">Cryptocurrency Loss</h4>
                    </div>
                    <div class="ml-8">
                      <p class="mb-2"><strong>Affected Contracts:</strong></p>
                      <ul class="list-disc list-inside mb-3 text-xs space-y-1">
                        <li>Bank Contract</li>
                        <li>Expense Account Contract (EIP712)</li>
                        <li>Cash Remuneration Contract (EIP712)</li>
                      </ul>
                      <p class="text-sm">
                        <strong>Loss Description:</strong> All cryptocurrency funds stored in these
                        contracts will be PERMANENTLY LOST and unrecoverable. Any ETH, tokens, or
                        other digital assets will be inaccessible forever.
                      </p>
                    </div>
                  </div>

                  <!-- Share Tokens Loss -->
                  <div class="border border-error rounded-lg p-4 bg-error/5">
                    <div class="flex items-start gap-2 mb-2">
                      <span class="text-error font-bold text-lg">🪙</span>
                      <h4 class="font-bold text-error text-base">Share Tokens Loss</h4>
                    </div>
                    <div class="ml-8">
                      <p class="mb-2"><strong>Affected Contracts:</strong></p>
                      <ul class="list-disc list-inside mb-3 text-xs space-y-1">
                        <li>Investor Contract (V1) / Share Token Contract</li>
                      </ul>
                      <p class="text-sm">
                        <strong>Loss Description:</strong> All existing share token holders will
                        permanently lose their tokens. Ownership records, voting power, and dividend
                        rights will be erased. Token distribution must be completely redone from
                        scratch.
                      </p>
                    </div>
                  </div>

                  <!-- Governance Data Loss -->
                  <div class="border border-error rounded-lg p-4 bg-error/5">
                    <div class="flex items-start gap-2 mb-2">
                      <span class="text-error font-bold text-lg">🗳️</span>
                      <h4 class="font-bold text-error text-base">Governance Data Loss</h4>
                    </div>
                    <div class="ml-8">
                      <p class="mb-2"><strong>Affected Contracts:</strong></p>
                      <ul class="list-disc list-inside mb-3 text-xs space-y-1">
                        <li>Board of Directors Contract</li>
                        <li>Voting Contract</li>
                        <li>Officer Contract</li>
                      </ul>
                      <p class="text-sm">
                        <strong>Loss Description:</strong> Complete deletion of election history,
                        voting records, current Board of Directors composition, and all governance
                        decisions. The entire democratic structure and its history will be
                        permanently erased.
                      </p>
                    </div>
                  </div>

                  <!-- Database Reset -->
                  <div class="border border-error rounded-lg p-4 bg-error/5">
                    <div class="flex items-start gap-2 mb-2">
                      <span class="text-error font-bold text-lg">🗄️</span>
                      <h4 class="font-bold text-error text-base">Team Contract Reset</h4>
                    </div>
                    <div class="ml-8">
                      <p class="mb-2"><strong>Affected Systems:</strong></p>
                      <ul class="list-disc list-inside mb-3 text-xs space-y-1">
                        <li>Team Officer Contract</li>
                        <li>Team Contracts will be removed</li>
                      </ul>
                      <p class="text-sm">
                        <strong>Loss Description:</strong> Here Only Team Contract related data will
                        be deleted, requiring complete redeployment and reconfiguration.
                      </p>
                    </div>
                  </div>
                </div>

                <div class="mt-4 p-4 bg-base-200 rounded-lg">
                  <p class="text-sm font-medium">
                    <strong>Note:</strong> This action cannot be undone. Ensure all stakeholders are
                    informed and that you have documented all important contract addresses and
                    configurations before proceeding.
                  </p>
                </div>
              </div>

              <div class="flex gap-3 justify-between">
                <ButtonUI
                  variant="secondary"
                  @click="showModal = false"
                  data-test="cancel-redeploy-contracts"
                >
                  Cancel
                </ButtonUI>
                <ButtonUI
                  variant="error"
                  @click="redeployContracts()"
                  data-test="confirm-redeploy-contracts"
                >
                  I Understand - Proceed with Redeployment
                </ButtonUI>
              </div>
              <!-- </div> -->
            </ModalComponent>
            <ButtonUI
              variant="primary"
              :enabled="teamStore.currentTeam?.ownerAddress == userStore.address"
              @click="showModal = true"
              data-test="createAddCampaign"
            >
              Redeploy Contracts
            </ButtonUI>
          </div>
        </template>
        <MainContractTable />
      </CardComponent>
    </div>
  </div>
</template>
<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'
import ButtonUI from '@/components/ButtonUI.vue'
import MainContractTable from './MainContractTable.vue'
import { ref } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useCustomFetch } from '@/composables'
import { useRouter } from 'vue-router'

const showModal = ref(false)

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const router = useRouter()

const { execute: resetContracts } = useCustomFetch('contract/reset', {
  immediate: false
})
  .delete({ teamId: teamStore.currentTeam?.id })
  .json()

const redeployContracts = async () => {
  await resetContracts()
  showModal.value = false
  // redirect to team page
  await router.push({ name: 'show-team', params: { id: teamStore.currentTeam?.id } })
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span>{{ isDetails ? `Past` : `Current` }} Election</span>
          <ElectionStatus
            v-if="formattedElection && (!formattedElection?.resultsPublished || isDetails)"
            :election-id="currentElectionId"
          />
        </div>
        <div class="flex justify-between">
          <ElectionActions
            v-if="!isDetails"
            :election-id="currentElectionId"
            @show-results-modal="showResultsModal = true"
            @show-create-election-modal="showCreateElectionModal = { mount: true, show: true }"
          />
          <UModal
            v-if="showCreateElectionModal.mount"
            v-model:open="showCreateElectionModal.show"
            :close="{
              onClick: () => {
                showCreateElectionModal = { mount: false, show: false }
                createElectionError = ''
              }
            }"
            title="Create election"
            description="Create a new Board of Directors election to manage your team's leadership."
          >
            <template #body>
              <CreateElectionForm
                :is-loading="isLoadingCreateElection /*|| isConfirmingCreateElection*/"
                :error-message="createElectionError"
                @create-proposal="createElection"
                @close-modal="() => (showCreateElectionModal = { mount: false, show: false })"
              />
            </template>
          </UModal>
        </div>
      </div>
    </template>
    <div
      v-if="formattedElection && (!formattedElection?.resultsPublished || isDetails)"
      class="mt-4"
    >
      <!-- Status and Countdown -->

      <div>
        <!-- Election Title -->
        <h2 class="font-semibold">
          {{ formattedElection?.title }}
        </h2>

        <h4 class="mb-6">
          {{ formattedElection?.description }}
        </h4>

        <!-- Stats Row -->
        <ElectionStats :formatted-election="formattedElection" />
      </div>
    </div>
    <ElectionSummaryEmptyState
      v-else
      @show-create-election-modal="showCreateElectionModal = { mount: true, show: true }"
    />
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CreateElectionForm from './forms/CreateElectionForm.vue'
import { useTeamStore } from '@/stores'
import type { OldProposal } from '@/types'
import { classifyError, log } from '@/utils'
import ElectionStatus from '@/components/sections/AdministrationView/ElectionStatus.vue'
import ElectionStats from '@/components/sections/AdministrationView/ElectionStats.vue'
import ElectionActions from './ElectionActions.vue'
import ElectionSummaryEmptyState from './ElectionSummaryEmptyState.vue'
import { useBoDElections, useElectionsCreateElection } from '@/composables/elections'
import { useCreateElectionNotificationsMutation } from '@/queries/action.queries'

const props = defineProps<{ electionId: bigint; isDetails?: boolean }>()

const teamStore = useTeamStore()
const toast = useToast()
const showResultsModal = ref(false)
const currentElectionId = computed(() => props.electionId)
const { electionsAddress, formattedElection } = useBoDElections(currentElectionId)
const showCreateElectionModal = ref({
  mount: false,
  show: false
})
const createElectionError = ref('')

const { mutateAsync: addElectionNotifications, error: electionNotificationError } =
  useCreateElectionNotificationsMutation()

const { mutateAsync: writeCreateElection, isPending: isLoadingCreateElection } =
  useElectionsCreateElection()

const createElection = async (electionData: OldProposal) => {
  try {
    createElectionError.value = ''
    if (!electionsAddress.value) {
      createElectionError.value = 'Elections contract address not found'
      return
    }

    const dateToUnixTimestamp = (date: Date) => Math.floor(date.getTime() / 1000)

    // The dates come from the form as they were decided there — the opening a
    // couple of minutes out, the closing at the hour the owner picked. Nothing
    // is adjusted here: an election rewritten on the way to the chain is an
    // election the owner never agreed to.
    const args = [
      electionData.title,
      electionData.description,
      BigInt(dateToUnixTimestamp(electionData.startDate as Date)),
      BigInt(dateToUnixTimestamp(electionData.endDate as Date)),
      BigInt(electionData.winnerCount),
      electionData.candidates?.map((c) => c.candidateAddress) || [],
      teamStore.currentTeam?.members.map((m) => m.address) || []
    ] as const

    await writeCreateElection({ args })

    await addElectionNotifications({ pathParams: { teamId: teamStore.currentTeamId! } })
    toast.add({ title: 'Election created successfully!', color: 'success' })
    showCreateElectionModal.value.show = false
    showCreateElectionModal.value.mount = false
  } catch (error) {
    log.error('creatingElection error:', error)
    const classified = classifyError(error, { contract: 'Elections' })
    if (classified.category === 'user_rejected') return
    createElectionError.value = classified.userMessage
  }
}

watch(electionNotificationError, (error) => {
  if (error) {
    toast.add({ title: 'Failed to send election notifications', color: 'error' })
    log.error('electionNotificationError.value: ', error)
  }
})
</script>

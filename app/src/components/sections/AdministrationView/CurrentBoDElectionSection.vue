<template>
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
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
              <UAlert v-if="createElectionError" color="error" variant="soft" :description="createElectionError" class="mb-4" />
              <CreateElectionForm
                :is-loading="isLoadingCreateElection /*|| isConfirmingCreateElection*/"
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
    <CurrentBoDElection404
      v-else
      @show-create-election-modal="showCreateElectionModal = { mount: true, show: true }"
    />
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CreateElectionForm from './forms/CreateElectionForm.vue'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { useTeamStore } from '@/stores'
import { simulateContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'
import type { OldProposal } from '@/types'
import { log, parseError } from '@/utils'
import { config } from '@/wagmi.config'
import ElectionStatus from '@/components/sections/AdministrationView/ElectionStatus.vue'
import ElectionStats from '@/components/sections/AdministrationView/ElectionStats.vue'
import ElectionActions from './ElectionActions.vue'
import CurrentBoDElection404 from './CurrentBoDElection404.vue'
import { useBoDElections } from '@/composables/elections'
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
const isLoadingCreateElection = ref(false)
const createElectionError = ref('')

const { mutateAsync: addElectionNotifications, error: electionNotificationError } =
  useCreateElectionNotificationsMutation()

const createElection = async (electionData: OldProposal) => {
  try {
    createElectionError.value = ''
    isLoadingCreateElection.value = true
    if (!electionsAddress.value) {
      createElectionError.value = 'Elections contract address not found'
      return
    }

    const dateToUnixTimestamp = (date: Date) => Math.floor(date.getTime() / 1000)
    const dateNow = dateToUnixTimestamp(new Date())

    const args = [
      electionData.title,
      electionData.description,
      dateToUnixTimestamp(electionData.startDate as Date) < dateNow
        ? dateNow + 60 // Start in 1 minute if start date is in the past
        : dateToUnixTimestamp(electionData.startDate as Date),
      dateToUnixTimestamp(electionData.startDate as Date) < dateNow
        ? dateNow + 60 + 60 // End 1 minute after adjusted start time if start date is in the past
        : dateToUnixTimestamp(electionData.endDate as Date),
      electionData.winnerCount,
      electionData.candidates?.map((c) => c.candidateAddress) || [],
      teamStore.currentTeam?.members.map((m) => m.address) || []
    ]

    await simulateContract(config, {
      address: electionsAddress.value,
      abi: ELECTIONS_ABI,
      functionName: 'createElection',
      args
    })

    const hash = await writeContract(config, {
      address: electionsAddress.value,
      abi: ELECTIONS_ABI,
      functionName: 'createElection',
      args
    })

    await waitForTransactionReceipt(config, {
      hash
    })

    await addElectionNotifications({ pathParams: { teamId: teamStore.currentTeamId! } })
    toast.add({ title: 'Election created successfully!', color: 'success' })
    showCreateElectionModal.value.show = false
    showCreateElectionModal.value.mount = false
  } catch (error) {
    createElectionError.value = parseError(error, ELECTIONS_ABI)
    log.error('creatingElection error:', error)
  } finally {
    isLoadingCreateElection.value = false
  }
}

watch(electionNotificationError, (error) => {
  if (error) {
    toast.add({ title: 'Failed to send election notifications', color: 'error' })
    log.error('electionNotificationError.value: ', error)
  }
})
</script>

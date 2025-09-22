<template>
  <CardComponent :title="`${isDetails ? `Past` : `Current`} Election`">
    <template #card-action>
      <div class="flex justify-between">
        <ElectionActions
          v-if="!isDetails"
          :election-id="currentElectionId"
          @show-results-modal="showResultsModal = true"
          @show-create-election-modal="showCreateElectionModal = { mount: true, show: true }"
        />
        <ModalComponent
          v-if="showCreateElectionModal.mount"
          v-model="showCreateElectionModal.show"
          @reset="() => (showCreateElectionModal = { mount: false, show: false })"
        >
          <CreateElectionForm
            :is-loading="isLoadingCreateElection || isConfirmingCreateElection"
            @create-proposal="createElection"
            @close-modal="() => (showCreateElectionModal = { mount: false, show: false })"
          />
        </ModalComponent>
      </div>
    </template>
    <template #card-badge>
      <ElectionStatus
        v-if="formattedElection && (!formattedElection?.resultsPublished || isDetails)"
        :election-id="currentElectionId"
      />
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
  </CardComponent>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import { computed, ref, watch } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CreateElectionForm from './forms/CreateElectionForm.vue'
import ElectionABI from '@/artifacts/abi/elections.json'
import { useTeamStore, useToastStore } from '@/stores'
import { type Abi } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { simulateContract } from '@wagmi/core'
import type { OldProposal } from '@/types'
import { log, parseError } from '@/utils'
import { config } from '@/wagmi.config'
import { useQueryClient } from '@tanstack/vue-query'
import ElectionStatus from '@/components/sections/AdministrationView/ElectionStatus.vue'
import ElectionStats from '@/components/sections/AdministrationView/ElectionStats.vue'
import ElectionActions from './ElectionActions.vue'
import CurrentBoDElection404 from './CurrentBoDElection404.vue'
import { useBoDElections } from '@/composables'

const props = defineProps<{ electionId: bigint; isDetails?: boolean }>()

const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()
const queryClient = useQueryClient()
const showResultsModal = ref(false)
const currentElectionId = computed(() => props.electionId)
const { electionsAddress, formattedElection } = useBoDElections(currentElectionId)
const showCreateElectionModal = ref({
  mount: false,
  show: false
})

const {
  data: hashCreateElection,
  writeContract: executeCreateElection,
  isPending: isLoadingCreateElection,
  error: errorCreateElection
} = useWriteContract()

const {
  isLoading: isConfirmingCreateElection,
  isSuccess: isConfirmedCreateElection,
  error: errorConfirmingCreateElection
} = useWaitForTransactionReceipt({
  hash: hashCreateElection
})

const createElection = async (electionData: OldProposal) => {
  try {
    if (!electionsAddress.value) {
      addErrorToast('Elections contract address not found')
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
      abi: ElectionABI,
      functionName: 'createElection',
      args
    })

    executeCreateElection({
      address: electionsAddress.value,
      args,
      abi: ElectionABI,
      functionName: 'createElection'
    })
  } catch (error) {
    addErrorToast(parseError(error, ElectionABI as Abi))
    log.error('creatingElection error:', error)
  }
}

watch(errorConfirmingCreateElection, (isError) => {
  if (isError) {
    addErrorToast(parseError(isError, ElectionABI as Abi))
    log.error('errorConfirmingCreateElection.value: ', isError)
  }
})

watch(errorCreateElection, (isError) => {
  if (isError) addErrorToast(parseError(isError, ElectionABI as Abi))
  log.error('errorCreateElection.value: ', isError)
})

watch(isConfirmingCreateElection, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedCreateElection.value) {
    addSuccessToast('Election created successfully!')
    showCreateElectionModal.value = { mount: false, show: false }
    await queryClient.invalidateQueries({
      queryKey: ['readContract']
    })
  }
})
</script>

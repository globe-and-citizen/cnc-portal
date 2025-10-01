<template>
  <CardComponent :title="`${isDetails ? `Past` : `Current`} Election`">
    <template #card-action>
      <div class="flex justify-between">
        <ElectionActions
          v-if="!isDetails"
          :election-id="currentElectionId"
          @show-results-modal="showResultsModal = true"
          @show-create-election-modal="showCreateElectionModal = true"
        />
        <ModalComponent v-if="showCreateElectionModal" v-model="showCreateElectionModal">
          <CreateElectionForm
            :is-loading="isLoadingCreateElection /*|| isConfirmingCreateElection*/"
            @create-proposal="createElection"
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
    <CurrentBoDElection404 v-else @show-create-election-modal="showCreateElectionModal = true" />
  </CardComponent>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import { computed, ref } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CreateElectionForm from './forms/CreateElectionForm.vue'
import ElectionABI from '@/artifacts/abi/elections.json'
import { useTeamStore, useToastStore } from '@/stores'
import { type Abi } from 'viem'
import { simulateContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'
import type { OldProposal } from '@/types'
import { log, parseError } from '@/utils'
import { config } from '@/wagmi.config'
import ElectionStatus from '@/components/sections/AdministrationView/ElectionStatus.vue'
import ElectionStats from '@/components/sections/AdministrationView/ElectionStats.vue'
import ElectionActions from './ElectionActions.vue'
import CurrentBoDElection404 from './CurrentBoDElection404.vue'
import { useBoDElections } from '@/composables'

const props = defineProps<{ electionId: bigint; isDetails?: boolean }>()

const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()
const showResultsModal = ref(false)
const currentElectionId = computed(() => props.electionId)
const { electionsAddress, formattedElection } = useBoDElections(currentElectionId)
const showCreateElectionModal = ref(false)
const isLoadingCreateElection = ref(false)

const createElection = async (electionData: OldProposal) => {
  try {
    isLoadingCreateElection.value = true
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

    console.log('Do nothing...')

    await simulateContract(config, {
      address: electionsAddress.value,
      abi: ElectionABI,
      functionName: 'createElection',
      args
    })

    const hash = await writeContract(config, {
      address: electionsAddress.value,
      abi: ElectionABI,
      functionName: 'createElection',
      args
    })

    await waitForTransactionReceipt(config, {
      hash
    })
    addSuccessToast('Election created successfully!')
    showCreateElectionModal.value = false
  } catch (error) {
    addErrorToast(parseError(error, ElectionABI as Abi))
    log.error('creatingElection error:', error)
  } finally {
    isLoadingCreateElection.value = false
  }
}
</script>

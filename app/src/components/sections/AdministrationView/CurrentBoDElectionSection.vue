<template>
  <CardComponent :title="`${isDetails ? `Past` : `Current`} Election`">
    <template #card-action>
      <div class="flex justify-between">
        <ElectionActions
          v-if="formattedElection && !isDetails"
          :formatted-election="formattedElection"
          @showResultsModal="showResultsModal = true"
        />
        <ModalComponent v-model="showCreateElectionModal">
          <CreateElectionForm
            :is-loading="isLoadingCreateElection || isConfirmingCreateElection"
            @create-proposal="createElection"
          />
        </ModalComponent>
        <ModalComponent
          v-if="
            (formattedElection?.endDate ?? new Date()) > new Date() ||
            formattedElection?.votesCast === formattedElection?.seatCount
          "
          v-model="showResultsModal"
        >
          <ElectionResultModal :id="formattedElection?.id ?? 1" />
        </ModalComponent>
      </div>
    </template>
    <div
      v-if="formattedElection && (!formattedElection?.resultsPublished || isDetails)"
      class="mt-4"
    >
      <!-- Status and Countdown -->
      <ElectionStatus :formatted-election="formattedElection" />
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
    <div
      v-else
      class="flex flex-col items-center justify-center gap-4 p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-100 mt-4"
    >
      <h2 class="text-xl font-semibold text-gray-700">No Current Election</h2>
      <p class="text-sm text-gray-500 text-center">
        There is no active election at the moment. Please check back later or create a new election.
      </p>
      <ButtonUI
        variant="primary"
        size="md"
        @click="showCreateElectionModal = true"
        data-test="create-election"
      >
        Create Election
      </ButtonUI>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import ElectionResultModal from '@/components/sections/AdministrationView/modals/ElectionResultModal.vue'
import { computed, ref, watch } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CreateElectionForm from './forms/CreateElectionForm.vue'
import ElectionABI from '@/artifacts/abi/elections.json'
import { useTeamStore, useToastStore } from '@/stores'
import { encodeFunctionData, type Abi, type Address } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from '@wagmi/vue'
import { estimateGas } from '@wagmi/core'
import type { OldProposal } from '@/types'
import { log, parseError } from '@/utils'
import { config } from '@/wagmi.config'
import { useQueryClient } from '@tanstack/vue-query'
import ElectionStatus from '@/components/sections/AdministrationView/ElectionStatus.vue'
import ElectionStats from '@/components/sections/AdministrationView/ElectionStats.vue'
import ElectionActions from './ElectionActions.vue'

const props = defineProps<{ electionId: bigint; isDetails?: boolean }>()

const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()
const queryClient = useQueryClient()
const showResultsModal = ref(false)
const currentElectionId = ref(props.electionId)
const showCreateElectionModal = ref(false)

// Contract addresses
const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections') as Address)

// Fetch current election details
const {
  data: currentElection,
  // isLoading: isLoadingCurrentElection,
  error: errorGetCurrentElection,
  queryKey: currentElectionQueryKey
} = useReadContract({
  functionName: 'getElection',
  address: electionsAddress.value,
  abi: ElectionABI,
  args: [props.electionId] // Supply currentElectionId as an argument
  // query: {
  //   enabled: computed(() => !!currentElectionId.value) // Only fetch if currentElectionId is available
  // }
})

const {
  data: voteCount,
  // isLoading: isLoadingVoteCount,
  error: errorGetVoteCount
} = useReadContract({
  functionName: 'getVoteCount',
  address: electionsAddress.value,
  abi: ElectionABI,
  args: [currentElectionId], // Supply currentElectionId as an argument
  query: {
    enabled: computed(() => !!currentElectionId.value) // Only fetch if currentElectionId is available
  }
})

const {
  data: candidateList,
  // isLoading: isLoadingCandidates,
  error: errorGetCandidates
} = useReadContract({
  functionName: 'getElectionCandidates',
  address: electionsAddress.value,
  abi: ElectionABI,
  args: [currentElectionId],
  query: {
    enabled: computed(() => !!currentElectionId.value) // Only fetch if currentElectionId is available
  }
})

const {
  data: hashCreateElection,
  writeContract: executeCreateElection,
  isPending: isLoadingCreateElection
  // isError: errorCreateElection
} = useWriteContract()

const { isLoading: isConfirmingCreateElection, isSuccess: isConfirmedCreateElection } =
  useWaitForTransactionReceipt({
    hash: hashCreateElection
  })

const formattedElection = computed(() => {
  if (!currentElection.value) return null

  const raw = currentElection.value as Array<string | bigint | boolean>

  return {
    id: Number(raw[0]),
    title: String(raw[1]),
    description: String(raw[2]),
    createdBy: String(raw[3]),
    startDate: new Date(Number(raw[4]) * 1000),
    endDate: new Date(Number(raw[5]) * 1000),
    seatCount: Number(raw[6]),
    resultsPublished: Boolean(raw[7]),
    votesCast: Number(voteCount.value || 0),
    candidates: (candidateList.value as string[])?.length
  }
})

const createElection = async (electionData: OldProposal) => {
  try {
    const args = [
      electionData.title,
      electionData.description,
      Math.floor((electionData.startDate as Date).getTime() / 1000),
      Math.floor((electionData.endDate as Date).getTime() / 1000),
      electionData.winnerCount,
      electionData.candidates?.map((c) => c.candidateAddress) || [],
      teamStore.currentTeam?.members.map((m) => m.address) || []
    ]

    const data = encodeFunctionData({
      abi: ElectionABI,
      functionName: 'createElection',
      args
    })

    await estimateGas(config, {
      to: electionsAddress.value,
      data
    })

    executeCreateElection({
      address: electionsAddress.value,
      args,
      abi: ElectionABI,
      functionName: 'createElection'
    })
  } catch (error) {
    addErrorToast(parseError(error, ElectionABI as Abi))
    log.error('Error creating election:', parseError(error, ElectionABI as Abi))
  }
}

watch(isConfirmingCreateElection, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedCreateElection.value) {
    addSuccessToast('Election created successfully!')
    showCreateElectionModal.value = false
    await queryClient.invalidateQueries({
      queryKey: [currentElectionQueryKey]
    })
  }
})

watch(errorGetCurrentElection, (error) => {
  if (error) {
    addErrorToast('Error fetching current election')
    log.error('errorGetCurrentElection.value:', error)
  }
})

watch(errorGetVoteCount, (error) => {
  if (error) {
    addErrorToast('Error fetching vote count')
    log.error('errorGetVoteCount.value:', error)
  }
})

watch(errorGetCandidates, (error) => {
  if (error) {
    addErrorToast('Error fetching candidates')
    log.error('errorGetCandidates.value:', error)
  }
})
</script>

<template>
  <CardComponent :title="`${isDetails ? `Past` : `Current`} Election`">
    <template #card-action>
      <div class="flex justify-between">
        <ElectionActions
          v-if="!isDetails"
          :formatted-election="formattedElection || null"
          @show-results-modal="showResultsModal = true"
          @show-create-election-modal="showCreateElectionModal = true"
        />
        <ModalComponent v-if="showCreateElectionModal" v-model="showCreateElectionModal">
          <CreateElectionForm
            :is-loading="isLoadingCreateElection || isConfirmingCreateElection"
            @create-proposal="createElection"
          />
        </ModalComponent>
        <ModalComponent
          v-if="
            (formattedElection?.endDate ?? new Date()) > new Date() ||
            formattedElection?.votesCast === formattedElection?.voters
          "
          v-model="showResultsModal"
        >
          <ElectionResultModal :id="formattedElection?.id ?? 1" />
        </ModalComponent>
      </div>
    </template>
    <template #card-badge>
      <ElectionStatus
        v-if="formattedElection && (!formattedElection?.resultsPublished || isDetails)"
        :formatted-election="formattedElection"
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
import ElectionResultModal from '@/components/sections/AdministrationView/modals/ElectionResultModal.vue'
import { computed, ref, watch } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CreateElectionForm from './forms/CreateElectionForm.vue'
import ElectionABI from '@/artifacts/abi/elections.json'
import { useTeamStore, useToastStore } from '@/stores'
import { encodeFunctionData, type Abi } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from '@wagmi/vue'
import { estimateGas } from '@wagmi/core'
import type { OldProposal } from '@/types'
import { log, parseError } from '@/utils'
import { config } from '@/wagmi.config'
import { useQueryClient } from '@tanstack/vue-query'
import ElectionStatus from '@/components/sections/AdministrationView/ElectionStatus.vue'
import ElectionStats from '@/components/sections/AdministrationView/ElectionStats.vue'
import ElectionActions from './ElectionActions.vue'
import CurrentBoDElection404 from './CurrentBoDElection404.vue'

const props = defineProps<{ electionId: bigint; isDetails?: boolean }>()

const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()
const queryClient = useQueryClient()
const showResultsModal = ref(false)
const currentElectionId = computed(() => props.electionId)
const showCreateElectionModal = ref(false)

// Contract addresses
const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections'))

// Fetch current election details
const {
  data: currentElection,
  // isLoading: isLoadingCurrentElection,
  error: errorGetCurrentElection
  //queryKey: currentElectionQueryKey
} = useReadContract({
  functionName: 'getElection',
  address: electionsAddress.value,
  abi: ElectionABI,
  args: [currentElectionId], // Supply currentElectionId as an argument
  query: {
    enabled: computed(() => !!currentElectionId.value) // Only fetch if currentElectionId is available
  }
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

const { data: voterList } = useReadContract({
  functionName: 'getElectionEligibleVoters',
  address: electionsAddress.value,
  abi: ElectionABI,
  args: [currentElectionId],
  query: {
    enabled: computed(() => !!currentElectionId.value)
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
    candidates: (candidateList.value as string[])?.length,
    voters: (voterList.value as string[])?.length || 0
  }
})

const createElection = async (electionData: OldProposal) => {
  try {
    if (!electionsAddress.value) {
      addErrorToast('Elections contract address not found')
      return
    }
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
      queryKey: ['readContract']
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

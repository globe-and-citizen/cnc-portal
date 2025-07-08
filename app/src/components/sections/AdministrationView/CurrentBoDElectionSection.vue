<template>
  <CardComponent title="Current Election">
    <template #card-action>
      <div class="flex justify-between">
        <div class="flex justify-between gap-2">
          <ButtonUI
            variant="primary"
            size="md"
            @click="showCreateElectionModal = !showCreateElectionModal"
            data-test="create-proposal"
          >
            Create Election
          </ButtonUI>
          <ButtonUI> View Election </ButtonUI>
        </div>
        <ModalComponent v-model="showCreateElectionModal">
          <!-- <VotingManagement :team="team" /> -->
          <CreateElectionForm
            :is-loading="isLoadingCreateElection || isConfirmingCreateElection"
            @create-proposal="createElection"
          />
        </ModalComponent>
      </div>
    </template>
    <div v-if="formattedElection">
      <!-- Status and Countdown -->
      <div class="flex items-center justify-start gap-2 mb-6">
        <span class="px-2 py-1 text-xs font-medium rounded-full" :class="electionStatus.class">
          {{ electionStatus.text }}
        </span>
        <span class="text-sm text-gray-600"> Ends in {{ timeRemaining }} </span>
      </div>
      <div>
        <!-- Election Title -->
        <h2 class="text-2xl text-center font-semibold mb-4">
          {{ /*electionData.title*/ formattedElection?.title }}
        </h2>

        <!-- Stats Row -->
        <div class="flex justify-between items-stretch gap-4">
          <!-- Candidates Stat -->
          <div class="flex-1 flex gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="p-3 bg-blue-50 rounded-full">
              <IconifyIcon icon="heroicons:user-group" class="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Candidates</p>
              <p class="text-xl font-semibold text-gray-900">
                {{ formattedElection?.candidates }}
              </p>
            </div>
          </div>

          <!-- End Date Stat -->
          <div
            class="flex-1 flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100"
          >
            <div class="p-3 bg-green-50 rounded-full">
              <IconifyIcon icon="heroicons:calendar" class="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Ends</p>
              <p class="text-xl font-semibold text-gray-900">
                {{ formatDate(formattedElection?.endDate) }}
              </p>
            </div>
          </div>

          <!-- Votes Stat -->
          <div
            class="flex-1 flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100"
          >
            <div class="p-3 bg-purple-50 rounded-full">
              <IconifyIcon icon="heroicons:chart-bar" class="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Votes Cast</p>
              <p class="text-xl font-semibold text-gray-900">
                {{ formattedElection?.votesCast }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-else
      class="flex flex-col items-center justify-center gap-4 p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-100"
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
import { Icon as IconifyIcon } from '@iconify/vue'
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CreateElectionForm from './forms/CreateElectionForm.vue'
import ElectionABI from '@/artifacts/abi/elections.json'
// import BoDABI from '@/artifacts/abi/bod.json'
import { useTeamStore, useToastStore } from '@/stores'
import { encodeFunctionData, type Abi, type Address } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from '@wagmi/vue'
import { estimateGas } from '@wagmi/core'
import type { Proposal } from '@/types'
import { log, parseError } from '@/utils'
import { config } from '@/wagmi.config'

const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()

// Contract addresses
const electionsAddress = computed(() => {
  const address = teamStore.currentTeam?.teamContracts?.find((c) => c.type === 'Elections')?.address
  return address as Address
})

// Fetch next election ID
const {
  data: nextElectionId,
  // isLoading: isLoadingNextElectionId,
  error: errorNextElectionId
} = useReadContract({
  functionName: 'getNextElectionId',
  address: electionsAddress.value,
  abi: ElectionABI
})

// Compute current election ID
const currentElectionId = computed(() => {
  console.log('nextElectionId.value:', nextElectionId.value)
  if (
    nextElectionId.value &&
    (typeof nextElectionId.value === 'number' || typeof nextElectionId.value === 'bigint')
  ) {
    return Number(nextElectionId.value) - 1
  }
  return null // Handle cases where nextElectionId is not available
})

// Fetch current election details
const {
  data: currentElection,
  // isLoading: isLoadingCurrentElection,
  error: errorGetCurrentElection
} = useReadContract({
  functionName: 'getElection',
  address: electionsAddress.value,
  abi: ElectionABI,
  args: [currentElectionId] // Supply currentElectionId as an argument
})

const {
  data: voteCount,
  // isLoading: isLoadingVoteCount,
  error: errorGetVoteCount
} = useReadContract({
  functionName: 'getVoteCount',
  address: electionsAddress.value,
  abi: ElectionABI,
  args: [currentElectionId] // Supply currentElectionId as an argument
})

const {
  data: candidateList,
  // isLoading: isLoadingCandidates,
  error: errorGetCandidates
} = useReadContract({
  functionName: 'getElectionCandidates',
  address: electionsAddress.value,
  abi: ElectionABI,
  args: [currentElectionId]
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
    title: raw[1],
    description: raw[2],
    createdBy: raw[3],
    startDate: new Date(Number(raw[4]) * 1000),
    endDate: new Date(Number(raw[5]) * 1000),
    seatCount: Number(raw[6]),
    resultsPublished: raw[7],
    votesCast: Number(voteCount.value || 0),
    candidates: (candidateList.value as string[])?.length
  }
})

const createElection = async (electionData: Proposal) => {
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
  } finally {
    showCreateElectionModal.value = false
  }
}

watch(isConfirmingCreateElection, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedCreateElection.value) {
    addSuccessToast('Election created successfully!')
    showCreateElectionModal.value = false
  }
})

// Watch for errors or loading states
watch(errorNextElectionId, (error) => {
  if (error) {
    addErrorToast('Error fetching next election ID')
    console.error('errorNextElectionId.value:', error)
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

const showCreateElectionModal = ref(false)

// Calculate time remaining
const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000 * 60) // Update every minute
})

onBeforeUnmount(() => {
  clearInterval(timer)
})

const timeRemaining = computed(() => {
  //const diff = electionData.endDate.getTime() - now.value.getTime()
  if (!formattedElection.value) return 'No election data available'

  const diff =
    formattedElection.value?.endDate.getTime() - formattedElection.value?.startDate.getTime()

  if (diff <= 0) return 'election ended'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'}`

  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`

  const minutes = Math.floor(diff / (1000 * 60))
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
})

// Election status
const electionStatus = computed(() => {
  if (!formattedElection.value) return { text: 'No Election', class: 'bg-gray-100 text-gray-800' }

  if (now.value < formattedElection.value?.startDate) {
    return { text: 'Upcoming', class: 'bg-yellow-100 text-yellow-800' }
  }
  if (now.value > formattedElection.value?.endDate) {
    return { text: 'Completed', class: 'bg-gray-100 text-gray-800' }
  }
  return { text: 'Active', class: 'bg-green-100 text-green-800' }
})

// Format date as "Dec 15, 2023"
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<style scoped>
/* Add slight spacing between stats on smaller screens */
@media (max-width: 768px) {
  .flex.justify-between {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>

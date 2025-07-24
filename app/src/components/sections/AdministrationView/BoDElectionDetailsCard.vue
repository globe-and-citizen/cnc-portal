<template>
  <div
    class="bg-base-100 card border border-gray-300 flex flex-col relative"
    :class="{ 'border-warning': isElectionWinner }"
  >
    <!-- Winner Badge (aligned to straddle border) -->
    <div
      v-if="isElectionWinner"
      class="absolute top-0 -translate-y-1/2 right-0 -translate-x-1/4 z-10"
    >
      <span class="badge badge-warning badge-lg gap-2 shadow-lg border-2 border-base-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
        Winner
      </span>
    </div>
    <div class="card-body">
      <!-- User Component -->
      <UserComponent layout="alternate" :user="election.user" />

      <!-- Votes Stat - Right-aligned below UserComponent -->
      <div class="flex justify-end mt-2">
        <span class="text-lg font-bold text-gray-700">
          {{ election.currentVotes }}/{{ election.totalVotes }}
        </span>
      </div>

      <!-- Custom Divider -->
      <!-- <div class="flex items-center my-2">
        <div class="w-6 h-6 rounded-full border-4 border-gray-600"></div>
        <div class="flex-1 border-t-4 border-gray-200"></div>
      </div> -->

      <progress
        class="progress progress-success my-4"
        :value="election.currentVotes"
        :max="election.totalVotes"
      ></progress>

      <!-- Conditional Button/Indicator -->
      <div
        v-if="hasVoted && voterChoice === election.user.address"
        class="badge badge-outline badge-warning badge-xl"
      >
        <IconifyIcon icon="heroicons-solid:check" class="h-5 w-5" />
        <span>Your Vote</span>
      </div>

      <!-- View Results Button -->
      <ButtonUI
        v-else
        variant="success"
        :outline="true"
        :disabled="hasVoted"
        :loading="isLoadingCastVoteLocal && isLoading"
        @click="
          () => {
            isLoadingCastVoteLocal = true
            emits('castVote', election.user.address)
          }
        "
        >Cast a Vote</ButtonUI
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import UserComponent from './UserComponent.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { computed, watch, type PropType, ref } from 'vue'
import type { User } from '@/types'
import { useReadContract } from '@wagmi/vue'
import { useUserDataStore, useTeamStore, useToastStore } from '@/stores'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import type { Address } from 'viem'
import { log, parseError } from '@/utils'

const props = defineProps({
  election: {
    type: Object as PropType<{
      user: User
      currentVotes: number
      totalVotes: number
      id: bigint
      endDate: Date
    }>,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emits = defineEmits(['castVote'])

const userDataStore = useUserDataStore()
const teamStore = useTeamStore()
const { addErrorToast } = useToastStore()

const isLoadingCastVoteLocal = ref(false)
const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections'))
const isElectionEnded = computed(
  () =>
    props.election.endDate < new Date() ||
    (Array.isArray(voterList.value) && voterList.value.length === props.election.totalVotes)
)

const isElectionWinner = computed(
  () =>
    isElectionEnded.value &&
    Array.isArray(electionResults.value) &&
    electionResults.value[0] === props.election.user.address
)

const { data: voterList } = useReadContract({
  functionName: 'getElectionEligibleVoters',
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  args: [props.election.id],
  query: {
    enabled: computed(() => !!props.election.id)
  }
})

const { data: hasVoted, error: errorHasVoted } = useReadContract({
  functionName: 'hasVoted',
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  args: [props.election.id, userDataStore.address as Address]
})

const { data: voterChoice } = useReadContract({
  functionName: 'getVoterChoice',
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  args: [props.election.id, userDataStore.address as Address]
})

const { data: electionResults } = useReadContract({
  functionName: 'getElectionResults',
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  args: [props.election.id]
})

watch(electionResults, (newResults) => {
  if (newResults) {
    console.log('newElectionResults: ', newResults)
  }
})

watch(errorHasVoted, (error) => {
  if (error) {
    addErrorToast(`Error checking vote status`)
    log.error('Error checking vote status:', parseError(error))
  }
})

watch(
  () => props.isLoading,
  (newState) => {
    if (!newState) isLoadingCastVoteLocal.value = false
  }
)
</script>

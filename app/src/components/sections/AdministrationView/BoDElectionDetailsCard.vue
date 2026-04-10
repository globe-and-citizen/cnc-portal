<template>
  <div
    class="bg-base-100 card relative flex flex-col border border-gray-300"
    :class="{ 'border-warning': isElectionWinner }"
  >
    <!-- Winner Badge (aligned to straddle border) -->
    <div
      v-if="isElectionWinner"
      class="badge badge-warning badge-lg border-base-100 absolute top-0 right-0 z-10 -translate-x-1/4 -translate-y-1/2 gap-2 border-2 shadow-lg"
    >
      <span class=""> Winner </span>
    </div>
    <div class="card-body">
      <!-- User Component -->
      <UserComponent layout="alternate" :user="election.user" />

      <!-- Votes Stat - Right-aligned below UserComponent -->
      <div class="mt-2 flex justify-end">
        <span class="text-lg font-bold text-gray-700">
          {{ election.currentVotes }}/{{ election.totalVotes }}
        </span>
      </div>

      <progress
        class="progress progress-success my-4"
        :value="election.currentVotes"
        :max="election.totalVotes"
      ></progress>

      <!-- Conditional Button/Indicator -->
      <div
        v-if="hasVoted && voterChoice === election.user.address"
        class="border-warning text-warning inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 px-6 py-3 text-base font-bold"
      >
        <IconifyIcon icon="heroicons-solid:check" class="h-5 w-5" />
        <span>Your Vote</span>
      </div>

      <!-- View Results Button -->
      <UButton
        v-else
        color="success"
        variant="outline"
        :disabled="isVoteDisabled"
        :loading="isLoadingCastVoteLocal && isLoading"
        @click="
          () => {
            isLoadingCastVoteLocal = true
            emits('castVote', election.user.address)
          }
        "
        label="Cast a Vote"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import UserComponent from './UserComponent.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { computed, watch, type PropType, ref } from 'vue'
import type { User } from '@/types'
import { useReadContract } from '@wagmi/vue'
import { useUserDataStore, useTeamStore } from '@/stores'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import type { Address } from 'viem'
import { log, parseError } from '@/utils'
import { useBoDElections } from '@/composables/elections'

const props = defineProps({
  election: {
    type: Object as PropType<{
      user: User
      currentVotes: number
      totalVotes: number
      id: bigint
      endDate: Date
      startDate: Date
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
const { electionStatus } = useBoDElections(computed(() => props.election.id))

const isLoadingCastVoteLocal = ref(false)
const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections'))

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

const isVoteDisabled = computed(
  () =>
    hasVoted.value === true ||
    electionStatus.value?.text === 'Upcoming' ||
    electionStatus.value?.text === 'Completed'
)

const isElectionWinner = computed(
  () =>
    electionStatus.value?.text === 'Completed' &&
    Array.isArray(electionResults.value) &&
    electionResults.value.find((address) => address === props.election.user.address)
)

watch(errorHasVoted, (error) => {
  if (error) {
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

<template>
  <UCard class="relative flex flex-col" :class="{ 'border-warning': isElectionWinner }">
    <!-- Winner Badge (aligned to straddle border) -->
    <UBadge
      v-if="isElectionWinner"
      color="warning"
      variant="solid"
      size="lg"
      class="absolute top-0 right-0 z-10 -translate-x-1/4 -translate-y-1/2 gap-2 border-2 border-white shadow-lg"
    >
      <span class=""> Winner </span>
    </UBadge>
    <!-- User Component -->
    <UserComponent layout="alternate" :user="election.user" />

    <!-- Votes Stat - Right-aligned below UserComponent -->
    <div class="mt-2 flex justify-end">
      <span class="text-lg font-bold text-gray-700">
        {{ election.currentVotes }}/{{ election.totalVotes }}
      </span>
    </div>

    <UProgress
      class="my-4"
      color="success"
      :value="election.currentVotes"
      :max="election.totalVotes"
    />

    <!-- Conditional Button/Indicator -->
    <div
      v-if="hasVoted && voterChoice === election.user.address"
      class="border-warning text-warning inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 px-6 py-3 text-base font-bold"
    >
      <IconifyIcon icon="heroicons-solid:check" class="h-5 w-5" />
      <span>Your Vote</span>
    </div>

    <!-- View Results Button -->
    <UTooltip v-else :text="voteTooltip">
      <UButton
        color="success"
        variant="outline"
        :disabled="isVoteDisabled"
        :loading="isLoadingCastVoteLocal && isLoading"
        @click="onCastVote"
        label="Cast a Vote"
      />
    </UTooltip>
  </UCard>
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
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

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

const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()

const isVoteDisabled = computed(
  () =>
    isWriteDisabled.value ||
    hasVoted.value === true ||
    electionStatus.value?.text === 'Upcoming' ||
    electionStatus.value?.text === 'Completed'
)

const voteTooltip = computed(() => archivedTooltip.value)

function onCastVote() {
  if (isVoteDisabled.value) return
  isLoadingCastVoteLocal.value = true
  emits('castVote', props.election.user.address)
}

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

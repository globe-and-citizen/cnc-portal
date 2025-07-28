<template>
  <div
    class="bg-base-100 card border border-gray-300 flex flex-col relative"
    :class="{ 'border-warning': isElectionWinner }"
  >
    <!-- Winner Badge (aligned to straddle border) -->
    <div
      v-if="isElectionWinner"
      class="absolute top-0 -translate-y-1/2 right-0 -translate-x-1/4 z-10 badge badge-warning badge-lg gap-2 shadow-lg border-2 border-base-100"
    >
      <span class=""> Winner </span>
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

      <progress
        class="progress progress-success my-4"
        :value="election.currentVotes"
        :max="election.totalVotes"
      ></progress>

      <!-- Conditional Button/Indicator -->
      <div
        v-if="hasVoted && voterChoice === election.user.address"
        class="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full border-2 border-warning text-warning font-bold text-base h-12"
      >
        <IconifyIcon icon="heroicons-solid:check" class="h-5 w-5" />
        <span>Your Vote</span>
      </div>

      <!-- View Results Button -->
      <ButtonUI
        v-else
        variant="success"
        :outline="true"
        :disabled="hasVoted || electionStatus === 'upcoming'"
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
import { useUserDataStore, useTeamStore } from '@/stores'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import type { Address } from 'viem'
import { log, parseError } from '@/utils'
import { useCountdown } from '@vueuse/core'

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

const isLoadingCastVoteLocal = ref(false)
const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections'))

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

const now = ref(new Date())
// let timer: ReturnType<typeof setInterval>

const timeLeft = computed(() => {
  const startDate = props.election.startDate
  const endDate = props.election.endDate
  return {
    toStart: Math.max(0, Math.floor((startDate.getTime() - now.value.getTime()) / 1000)),
    toEnd: Math.max(0, Math.floor((endDate.getTime() - now.value.getTime()) / 1000))
  }
})

const { remaining: leftToStart } = useCountdown(timeLeft.value.toStart, {
  immediate: true
})

const { remaining: leftToEnd } = useCountdown(timeLeft.value.toEnd, {
  immediate: true
})

// onMounted(() => {
//   timer = setInterval(() => {
//     now.value = new Date()
//   }, 1000 * 30) // Update every minute
// })

// onBeforeUnmount(() => {
//   clearInterval(timer)
// })

const electionStatus = computed(() => {
  if (leftToStart.value > 0) return 'upcoming'

  if (
    !(Array.isArray(voterList.value) && voterList.value.length === props.election.totalVotes) &&
    leftToEnd.value > 0
  )
    return 'active'

  return 'ended'
})

const isElectionWinner = computed(
  () =>
    electionStatus.value === 'ended' &&
    Array.isArray(electionResults.value) &&
    electionResults.value[0] === props.election.user.address
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

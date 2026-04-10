<template>
  <div class="bg-base-100 card flex flex-col border border-gray-300">
    <div class="card-body">
      <!-- Status and Date -->
      <div class="mb-3 flex items-start justify-between">
        <span class="badge bg-gray-100"> Completed </span>
        <span class="text-gray-600">
          {{ formatDate(election.endDate) }}
        </span>
      </div>

      <!-- Election Title -->
      <h3 class="mb-4 text-left text-xl font-bold">{{ election.title }}</h3>

      <!-- Candidates Count -->
      <div class="mb-2 flex items-center justify-between">
        <span class="text-gray-600">Candidates:</span>
        <span class="text-2xl font-semibold text-gray-600">{{ election.seatCount }}</span>
      </div>

      <!-- Votes Count -->
      <div class="mb-4 flex items-center justify-between">
        <span class="text-gray-600">Total Votes:</span>
        <span class="text-2xl font-semibold text-gray-600">{{ voteCount }}</span>
      </div>

      <div class="grow"></div>
      <!-- Spacer -->
      <div class="my-4 border-t border-gray-300"></div>
      <!-- Elected Members -->
      <div class="mb-5">
        <p class="mb-2 text-gray-600">Elected Members:</p>
        <div class="flex flex-wrap gap-2">
          <span v-for="(member, i) in electionResults" :key="i" class="badge badge-info">
            {{
              teamStore.currentTeam?.members.find((m) => m.address === member)?.name || 'Unknown'
            }}
          </span>
        </div>
      </div>

      <!-- View Results Button -->
      <UButton
        color="success"
        variant="outline"
        @click="
          () => {
            void router.push(
              `/teams/${teamStore.currentTeamId}/administration/bod-elections-details?electionId=${election.id}`
            )
          }
        "
        label="View Results"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { useTeamStore } from '@/stores'
import type { Election } from '@/types'
import { log, parseError } from '@/utils'
import { useReadContract } from '@wagmi/vue'
import { useRouter } from 'vue-router'
import { computed, watch } from 'vue'

const { election } = defineProps<{
  election: Election
}>()
const teamStore = useTeamStore()
const router = useRouter()
const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections'))

const {
  data: voteCount,
  // isLoading: isLoadingVoteCount,
  error: errorGetVoteCount
} = useReadContract({
  functionName: 'getVoteCount',
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  args: [BigInt(election.id)] // Supply currentElectionId as an argument
})

const { data: electionResults, error: errorGetElectionResults } = useReadContract({
  functionName: 'getElectionResults',
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  args: [BigInt(election.id)] // Supply currentElectionId as an argument
})

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

watch(errorGetVoteCount, (newError) => {
  if (newError) {
    log.error('Error fetching vote count:', parseError(newError))
  }
})
watch(errorGetElectionResults, (newError) => {
  if (newError) {
    log.error('Error fetching election results:', parseError(newError))
  }
})
</script>

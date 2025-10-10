<template>
  <div class="bg-base-100 card border border-gray-300 flex flex-col">
    <div class="card-body">
      <!-- Status and Date -->
      <div class="flex justify-between items-start mb-3">
        <span class="badge bg-gray-100"> Completed </span>
        <span class="text-gray-600">
          {{ formatDate(election.endDate) }}
        </span>
      </div>

      <!-- Election Title -->
      <h3 class="text-xl font-bold mb-4 text-left">{{ election.title }}</h3>

      <!-- Candidates Count -->
      <div class="flex justify-between items-center mb-2">
        <span class="text-gray-600">Candidates:</span>
        <span class="font-semibold text-2xl text-gray-600">{{ election.seatCount }}</span>
      </div>

      <!-- Votes Count -->
      <div class="flex justify-between items-center mb-4">
        <span class="text-gray-600">Total Votes:</span>
        <span class="font-semibold text-2xl text-gray-600">{{ voteCount }}</span>
      </div>

      <div class="flex-grow"></div>
      <!-- Spacer -->
      <div class="border-t border-gray-300 my-4"></div>
      <!-- Elected Members -->
      <div class="mb-5">
        <p class="text-gray-600 mb-2">Elected Members:</p>
        <div class="flex flex-wrap gap-2">
          <span v-for="(member, i) in electionResults" :key="i" class="badge badge-info">
            {{
              teamStore.currentTeam?.members.find((m) => m.address === member)?.name || 'Unknown'
            }}
          </span>
        </div>
      </div>

      <!-- View Results Button -->
      <ButtonUI
        variant="success"
        :outline="true"
        @click="
          () =>
            router.push(
              `/teams/${teamStore.currentTeam?.id}/administration/bod-elections-details?electionId=${election.id}`
            )
        "
      >
        View Results
      </ButtonUI>
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
import ButtonUI from '@/components/ButtonUI.vue'

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

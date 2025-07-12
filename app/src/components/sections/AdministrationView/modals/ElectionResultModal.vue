<template>
  <h2 class="font-semibold text-xl mb-5">Results for Election ID: {{ id }}</h2>

  <div class="font-semibold">Winners:</div>
  <div v-if="isFetching" class="text-gray-500">Loading results...</div>
  <div v-else v-for="(winner, index) in electionResults" :key="index">
    <div>- {{ winner }}</div>
  </div>
</template>
<script lang="ts" setup>
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { useTeamStore, useToastStore } from '@/stores'
import { parseError } from '@/utils'
import { useReadContract } from '@wagmi/vue'
import type { Address } from 'viem'
import { computed, watch } from 'vue'
const toastStore = useToastStore()
const teamStore = useTeamStore()
const electionsAddress = computed(() => {
  const address = teamStore.currentTeam?.teamContracts?.find((c) => c.type === 'Elections')?.address
  return address as Address
})
const { id } = defineProps<{
  id: number
}>()

const {
  data: electionResults,
  isFetching,
  error
} = useReadContract({
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  functionName: 'getElectionResults',
  args: [BigInt(id)]
})

watch(error, (newError) => {
  if (newError) {
    console.error('Error fetching election results:', parseError(newError))
    toastStore.addErrorToast('Failed to fetch election results')
  }
})
</script>

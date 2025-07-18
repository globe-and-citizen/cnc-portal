<template>
  <CurrentBoDElectionSection
    v-if="currentElectionId"
    :election-id="currentElectionId"
    :is-details="formattedElection?.resultsPublished"
  />
  <CurrentBoDSection
    v-if="formattedElection?.resultsPublished && currentElectionId"
    :election-id="currentElectionId"
  />
  <ElectionDetailsSection v-if="currentElectionId" :election-id="currentElectionId" />
</template>

<script setup lang="ts">
import CurrentBoDElectionSection from '@/components/sections/AdministrationView/CurrentBoDElectionSection.vue'
import ElectionDetailsSection from '@/components/sections/AdministrationView/BoDElectionDetailsSection.vue'
import CurrentBoDSection from '@/components/sections/AdministrationView/CurrentBoDSection.vue'
import { useTeamStore } from '@/stores'
import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import type { Address } from 'viem'
import { useRouter } from 'vue-router'

const teamStore = useTeamStore()
const router = useRouter()
const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections') as Address)

// Fetch next election ID
const {
  data: nextElectionId
  // isLoading: isLoadingNextElectionId,
} = useReadContract({
  functionName: 'getNextElectionId',
  address: electionsAddress.value,
  abi: ELECTIONS_ABI
})

// Compute current election ID
const currentElectionId = computed(() => {
  if (typeof router.currentRoute.value.query.electionId === 'string')
    return BigInt(router.currentRoute.value.query.electionId)
  if (
    nextElectionId.value &&
    (typeof nextElectionId.value === 'number' || typeof nextElectionId.value === 'bigint')
  ) {
    return BigInt(Number(nextElectionId.value) - 1)
  }
  return 0n // Handle cases where nextElectionId is not available
})

// Fetch current election details
const { data: currentElection } = useReadContract({
  functionName: 'getElection',
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  args: [currentElectionId],
  query: {
    enabled: true
  }
})

const formattedElection = computed(() => {
  if (!currentElection.value) return null

  const raw = currentElection.value

  return {
    id: Number(raw[0]),
    title: raw[1],
    description: raw[2],
    createdBy: raw[3],
    startDate: new Date(Number(raw[4]) * 1000),
    endDate: new Date(Number(raw[5]) * 1000),
    seatCount: Number(raw[6]),
    resultsPublished: raw[7]
  }
})
</script>

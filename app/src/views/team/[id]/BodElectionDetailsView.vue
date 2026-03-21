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
import { computed, watch, provide } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { useRouter } from 'vue-router'
import { log, parseError } from '@/utils'

provide('showPublishResultBtn', true)
const teamStore = useTeamStore()
const router = useRouter()
const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections'))

// Fetch next election ID
const {
  data: nextElectionId
  // isLoading: isLoadingNextElectionId,
} = useReadContract({
  functionName: 'getNextElectionId',
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  query: {
    enabled: true
  }
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
const { data: currentElection, error: errorGetElection } = useReadContract({
  functionName: 'getElection',
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  args: [currentElectionId],
  query: {
    enabled: true
  }
})

type ElectionTuple = [bigint, string, string, string, bigint, bigint, bigint, boolean]

const formattedElection = computed(() => {
  if (!currentElection.value) return null

  const raw = currentElection.value
  if (!Array.isArray(raw) || raw.length < 8) {
    return null
  }
  const tuple = raw as unknown as ElectionTuple

  return {
    id: Number(tuple[0]),
    title: tuple[1],
    description: tuple[2],
    createdBy: tuple[3],
    startDate: new Date(Number(tuple[4]) * 1000),
    endDate: new Date(Number(tuple[5]) * 1000),
    seatCount: Number(tuple[6]),
    resultsPublished: tuple[7]
  }
})

watch(errorGetElection, (error) => {
  if (error) {
    log.error('Error fetching current election: ', parseError(error))
  }
})
</script>

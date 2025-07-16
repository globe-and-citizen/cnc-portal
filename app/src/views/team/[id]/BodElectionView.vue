<template>
  <CurrentBoDSection />
  <CurrentBoDElectionSection :election-id="currentElectionId" />
  <PastBoDElectionsSection />
</template>

<script setup lang="ts">
import CurrentBoDSection from '@/components/sections/AdministrationView/CurrentBoDSection.vue'
import CurrentBoDElectionSection from '@/components/sections/AdministrationView/CurrentBoDElectionSection.vue'
import PastBoDElectionsSection from '@/components/sections/AdministrationView/PastBoDElectionsSection.vue'
import { useReadContract } from '@wagmi/vue'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import type { Address } from 'viem'
import { useTeamStore } from '@/stores'
import { computed } from 'vue'

const teamStore = useTeamStore()
const electionsAddress = computed(() => {
  const address = teamStore.currentTeam?.teamContracts?.find((c) => c.type === 'Elections')?.address
  return address as Address
})

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
  if (
    nextElectionId.value &&
    (typeof nextElectionId.value === 'number' || typeof nextElectionId.value === 'bigint')
  ) {
    return BigInt(Number(nextElectionId.value) - 1)
  }
  return 0n // Handle cases where nextElectionId is not available
})
</script>

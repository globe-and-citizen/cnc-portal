<template>
  <BodMembersSection />
  <ElectionSummarySection v-if="nextElectionId" :election-id="currentElectionId" />
  <PastElectionsSection />
  <ContractOwnerCard v-if="electionsAddress" :contractAddress="electionsAddress" />
</template>

<script setup lang="ts">
import BodMembersSection from '@/components/sections/AdministrationView/BodMembersSection.vue'
import ElectionSummarySection from '@/components/sections/AdministrationView/ElectionSummarySection.vue'
import PastElectionsSection from '@/components/sections/AdministrationView/PastElectionsSection.vue'
import { useReadContract } from '@wagmi/vue'
import { electionsAbi } from '@/artifacts/abi/generated'
import { useTeamStore } from '@/stores'
import { computed, watch } from 'vue'
import { log } from '@/lib/logging'
import ContractOwnerCard from '@/components/ui/ContractOwnerCard.vue'

const teamStore = useTeamStore()
const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections'))

// Fetch next election ID
const {
  data: nextElectionId,
  error: errorGetNextElectionId
  // isLoading: isLoadingNextElectionId,
} = useReadContract({
  functionName: 'getNextElectionId',
  address: electionsAddress,
  abi: electionsAbi,
  query: {
    enabled: computed(() => !!electionsAddress.value)
  }
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

watch(errorGetNextElectionId, (error) => {
  if (error) {
    log.error('Error fetching next election ID: ', error)
  }
})
</script>

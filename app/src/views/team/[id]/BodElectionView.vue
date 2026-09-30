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
import ContractOwnerCard from '@/components/ui/ContractOwnerCard.vue'
import { useElectionsAddress, useElectionsNextElectionId } from '@/composables/elections'
import { currentElectionId as electionInProgress } from '@/utils/elections/election'
import { computed, watch } from 'vue'
import { log } from '@/lib/logging'

const electionsAddress = useElectionsAddress()
const { data: nextElectionId, error: errorGetNextElectionId } = useElectionsNextElectionId()

const currentElectionId = computed(() => electionInProgress(nextElectionId.value))

watch(errorGetNextElectionId, (error) => {
  if (error) {
    log.error('Error fetching next election ID: ', error)
  }
})
</script>

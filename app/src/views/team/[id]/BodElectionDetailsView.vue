<template>
  <ElectionSummarySection
    v-if="currentElectionId"
    :election-id="currentElectionId"
    :is-details="election?.resultsPublished"
  />
  <BodMembersSection
    v-if="election?.resultsPublished && currentElectionId"
    :election-id="currentElectionId"
  />
  <ElectionCandidatesSection v-if="currentElectionId" :election-id="currentElectionId" />
</template>

<script setup lang="ts">
import ElectionSummarySection from '@/components/sections/AdministrationView/ElectionSummarySection.vue'
import ElectionCandidatesSection from '@/components/sections/AdministrationView/ElectionCandidatesSection.vue'
import BodMembersSection from '@/components/sections/AdministrationView/BodMembersSection.vue'
import {
  provideBoDElections,
  useBoDElections,
  useElectionsNextElectionId
} from '@/composables/elections'
import {
  currentElectionId as electionInProgress,
  parseElectionId
} from '@/utils/elections/election'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const { data: nextElectionId } = useElectionsNextElectionId()

/**
 * The election named in the URL, which is how a past one is opened, and
 * otherwise the election in progress — the one before the next id.
 */
const currentElectionId = computed(
  () => parseElectionId(route.query.electionId) ?? electionInProgress(nextElectionId.value)
)

const bodElection = useBoDElections(currentElectionId)
provideBoDElections(bodElection)
const { formattedElection: election } = bodElection
</script>

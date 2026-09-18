<template>
  <UCard class="flex h-full flex-col" :ui="{ body: 'flex flex-1 flex-col' }">
    <!-- Status and Date -->
    <div class="mb-3 flex items-start justify-between">
      <UBadge color="neutral" variant="soft"> Completed </UBadge>
      <span class="text-gray-600">
        {{ formatDate(election.endDate) }}
      </span>
    </div>

    <!-- Election Title -->
    <h3 class="mb-4 text-left text-xl font-bold">{{ election.title }}</h3>

    <!-- Seats, candidates and turnout: three figures, each saying what it counts -->
    <div
      v-for="figure in figures"
      :key="figure.label"
      class="mb-2 flex items-center justify-between"
      :data-test="figure.test"
    >
      <span class="text-gray-600">{{ figure.label }}:</span>
      <span class="text-2xl font-semibold text-gray-600">{{ figure.value }}</span>
    </div>

    <div class="grow"></div>
    <!-- Spacer -->
    <div class="my-4 border-t border-gray-300"></div>
    <!-- Elected Members -->
    <div class="mb-5">
      <p class="mb-2 text-gray-600">Elected Members:</p>
      <div class="flex flex-wrap gap-2">
        <UBadge v-for="member in winners" :key="member" color="info" variant="subtle">
          {{ memberName(member) }}
        </UBadge>
      </div>
    </div>

    <!-- View Results Button -->
    <UButton color="success" variant="outline" label="View Results" @click="viewResults" />
  </UCard>
</template>

<script setup lang="ts">
import { useTeamStore } from '@/stores'
import type { Election } from '@/types'
import { log } from '@/lib/logging'
import { formatDate } from '@/utils/format'
import { isSameAddress } from '@/utils/elections/election'
import {
  useElectionsGetCandidates,
  useElectionsGetVoteCount,
  useElectionsGetWinners
} from '@/composables/elections'
import { useRouter } from 'vue-router'
import { computed, watch, type Ref } from 'vue'

const props = defineProps<{
  election: Election
}>()
const teamStore = useTeamStore()
const router = useRouter()
const electionId = computed(() => BigInt(props.election.id))

const { data: voteCount, error: errorGetVoteCount } = useElectionsGetVoteCount(electionId)
const { data: candidates, error: errorGetCandidates } = useElectionsGetCandidates(electionId)
// A card only exists for a published election, so the recorded winners are
// always there to read — never the provisional standings.
const { data: winners, error: errorGetWinners } = useElectionsGetWinners(electionId)

const figures = computed(() => [
  { test: 'seats', label: 'Seats', value: props.election.seatCount },
  { test: 'candidates', label: 'Candidates', value: candidates.value?.length ?? 0 },
  { test: 'votes-cast', label: 'Votes cast', value: voteCount.value ?? 0 }
])

const memberName = (address: string) =>
  teamStore.currentTeam?.members.find((m) => isSameAddress(m.address, address))?.name || 'Unknown'

const viewResults = () => {
  void router.push(
    `/teams/${teamStore.currentTeamId}/administration/bod-elections-details?electionId=${props.election.id}`
  )
}

const logOnError = (error: Ref<Error | null>, message: string) =>
  watch(error, (value) => {
    if (value) log.error(message, value)
  })

logOnError(errorGetVoteCount, 'Error fetching vote count:')
logOnError(errorGetCandidates, 'Error fetching election candidates:')
logOnError(errorGetWinners, 'Error fetching election winners:')
</script>

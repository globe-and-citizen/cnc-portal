<template>
  <UCard>
    <template #header>{{ electionId ? `Elected` : `Current` }} Board of Directors</template>
    <div
      v-if="members.length > 0"
      class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      <div
        v-for="memberAddress in members"
        :key="memberAddress"
        class="bg-success/10 border-success/30 overflow-hidden rounded-xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        <UserIdentity :user="memberFor(memberAddress)" :isDetailedView="true" class="p-6" />
      </div>
    </div>
    <div v-else-if="isFetching" class="col-span-full text-center">Loading...</div>
    <BodMembersEmptyState v-else />
  </UCard>
</template>
<script setup lang="ts">
import UserIdentity from '@/components/ui/UserIdentity.vue'
import BodMembersEmptyState from './BodMembersEmptyState.vue'
import { useTeamStore } from '@/stores'
import type { User } from '@/types'
import { useBodGetBoardOfDirectors } from '@/composables/bod/reads'
import { useElectionsGetWinners } from '@/composables/elections'
import { computed, watch } from 'vue'
import { log } from '@/lib/logging'

const props = defineProps<{
  electionId?: bigint
}>()

const teamStore = useTeamStore()

const { data: boardOfDirectors, isFetching } = useBodGetBoardOfDirectors()

const currentBoard = computed<string[]>(() =>
  Array.isArray(boardOfDirectors.value)
    ? boardOfDirectors.value.filter((member): member is string => typeof member === 'string')
    : []
)

/**
 * Falls back to 0 so the shared read has an id to key on; it stays disabled
 * until a real election is named, and ids start at 1.
 */
const winnersElectionId = computed(() => props.electionId ?? 0n)
const { data: electionWinners, error: errorGetElectionWinners } =
  useElectionsGetWinners(winnersElectionId)

const members = computed<readonly string[]>(() =>
  props.electionId && electionWinners.value ? electionWinners.value : currentBoard.value
)

const memberFor = (address: string) =>
  teamStore.currentTeamMeta?.data?.members.find((m) => m.address === address) as User

watch(errorGetElectionWinners, (error) => {
  if (error) log.error('Error fetching election winners: ', error)
})
</script>

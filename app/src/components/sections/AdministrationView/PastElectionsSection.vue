<template>
  <UCard>
    <template #header>Past Election</template>
    <div v-if="isLoading" class="flex h-96 w-full items-center justify-center">
      <div class="text-gray-500">Loading past elections...</div>
    </div>
    <PastElectionsEmptyState v-else-if="elections.length === 0" :is-loading="isLoading" />
    <div v-else class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <PastElectionCard v-for="election in elections" :key="election.id" :election="election" />
    </div>
  </UCard>
</template>
<script setup lang="ts">
import { computed, watch } from 'vue'
import PastElectionCard from './PastElectionCard.vue'
import PastElectionsEmptyState from './PastElectionsEmptyState.vue'
import { useElectionsPastElections } from '@/composables/elections'
import { log } from '@/lib/logging'

const { data: pastElections, isLoading, error } = useElectionsPastElections()

const elections = computed(() => pastElections.value ?? [])

watch(error, (newError) => {
  if (newError) log.error('Error fetching past elections:', newError)
})
</script>

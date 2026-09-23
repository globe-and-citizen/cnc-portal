<template>
  <UCard>
    <template #header>Past Elections</template>
    <div v-if="isLoading" class="text-muted flex h-96 w-full items-center justify-center">
      Loading past elections...
    </div>
    <PastElectionsEmptyState v-else-if="total === 0" />
    <div v-else class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <PastElectionCard v-for="election in pageItems" :key="election.id" :election="election" />
    </div>

    <template v-if="!isLoading && total > pageSize" #footer>
      <TablePagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-size-options="PAGE_SIZE_OPTIONS"
        noun="elections"
        data-test-prefix="past-elections"
      />
    </template>
  </UCard>
</template>
<script setup lang="ts">
import { watch } from 'vue'
import PastElectionCard from './PastElectionCard.vue'
import PastElectionsEmptyState from './PastElectionsEmptyState.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import { useElectionsPastElections } from '@/composables/elections'
import { usePaginatedList } from '@/composables/usePagination'
import { log } from '@/lib/logging'

/** Multiples of the three-column grid, so a full page never leaves a ragged row. */
const PAGE_SIZE_OPTIONS = [6, 12, 24]

const { data: pastElections, isLoading, error } = useElectionsPastElections()

const { page, pageSize, pageItems, total } = usePaginatedList(() => pastElections.value ?? [], {
  key: 'pastElections',
  defaultPageSize: PAGE_SIZE_OPTIONS[0],
  pageSizeOptions: PAGE_SIZE_OPTIONS
})

watch(error, (newError) => {
  if (newError) log.error('Error fetching past elections:', newError)
})
</script>

<script setup lang="ts">
import type { ExpensesStats } from '~/types'

defineProps<{
  data: ExpensesStats | null | undefined
  isLoading: boolean
}>()
</script>

<template>
  <UPageCard title="Expenses Statistics" variant="subtle">
    <template v-if="isLoading">
      <USkeleton class="h-32 w-full" />
    </template>
    <template v-else-if="data">
      <div class="space-y-4">
        <p class="text-muted">
          Coming soon: Detailed expenses statistics and analytics
        </p>
        <div class="text-sm space-y-2">
          <div>Total Expenses: {{ data.totalExpenses }}</div>
          <div>Pending: {{ data.pendingExpenses }}</div>
        </div>
      </div>
    </template>
  </UPageCard>
</template>

<script setup lang="ts">
import type { ActionsStats } from '~/types'

defineProps<{
  data: ActionsStats | null | undefined
  isLoading: boolean
}>()
</script>

<template>
  <UPageCard title="Board Actions Statistics" variant="subtle">
    <template v-if="isLoading">
      <USkeleton class="h-32 w-full" />
    </template>
    <template v-else-if="data">
      <div class="space-y-4">
        <p class="text-muted">
          Coming soon: Detailed board actions statistics and analytics
        </p>
        <div class="text-sm space-y-2">
          <div>Total Actions: {{ data.totalActions }}</div>
          <div>Executed: {{ data.executedActions }}</div>
        </div>
      </div>
    </template>
  </UPageCard>
</template>

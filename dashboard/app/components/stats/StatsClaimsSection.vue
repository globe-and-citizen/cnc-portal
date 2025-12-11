<script setup lang="ts">
import type { ClaimsStats } from '~/types'

defineProps<{
  data: ClaimsStats | null | undefined
  isLoading: boolean
}>()
</script>

<template>
  <UPageCard title="Claims Statistics" variant="subtle">
    <template v-if="isLoading">
      <USkeleton class="h-32 w-full" />
    </template>
    <template v-else-if="data">
      <div class="space-y-4">
        <p class="text-muted">
          Coming soon: Detailed claims statistics and analytics
        </p>
        <div class="text-sm space-y-2">
          <div>Total Claims: {{ data.totalClaims }}</div>
          <div>Total Hours: {{ data.totalHoursClaimed }}</div>
        </div>
      </div>
    </template>
  </UPageCard>
</template>

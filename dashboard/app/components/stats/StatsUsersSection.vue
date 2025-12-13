<script setup lang="ts">
import type { UserStats } from '~/types'

defineProps<{
  data: UserStats | null | undefined
  isLoading: boolean
}>()
</script>

<template>
  <UPageCard title="User Statistics" variant="subtle">
    <template v-if="isLoading">
      <USkeleton class="h-32 w-full" />
    </template>
    <template v-else-if="data">
      <div class="space-y-4">
        <p class="text-muted">
          Coming soon: Detailed user statistics and analytics
        </p>
        <div class="text-sm space-y-2">
          <div>Total Users: {{ data.totalUsers }}</div>
          <div>Active Users: {{ data.activeUsers }}</div>
        </div>
      </div>
    </template>
  </UPageCard>
</template>

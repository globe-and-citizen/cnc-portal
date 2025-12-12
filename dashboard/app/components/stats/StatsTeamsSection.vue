<script setup lang="ts">
import type { TeamStats } from '~/types'

defineProps<{
  data: TeamStats | null | undefined
  isLoading: boolean
}>()
</script>

<template>
  <UPageCard title="Teams Statistics" variant="subtle">
    <template v-if="isLoading">
      <USkeleton class="h-32 w-full" />
    </template>
    <template v-else-if="data">
      <div class="space-y-4">
        <p class="text-muted">
          Coming soon: Detailed team statistics and analytics
        </p>
        <div class="text-sm space-y-2">
          <div>Total Teams: {{ data.totalTeams }}</div>
          <div>Top Teams: {{ data.topTeamsByMembers?.length || 0 }}</div>
        </div>
      </div>
    </template>
  </UPageCard>
</template>

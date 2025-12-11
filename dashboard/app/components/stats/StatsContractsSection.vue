<script setup lang="ts">
import type { ContractsStats } from '~/types'

defineProps<{
  data: ContractsStats | null | undefined
  isLoading: boolean
}>()
</script>

<template>
  <UPageCard title="Contracts Statistics" variant="subtle">
    <template v-if="isLoading">
      <USkeleton class="h-32 w-full" />
    </template>
    <template v-else-if="data">
      <div class="space-y-4">
        <p class="text-muted">
          Coming soon: Detailed contracts statistics and analytics
        </p>
        <div class="text-sm space-y-2">
          <div>Total Contracts: {{ data.totalContracts }}</div>
          <div>Active: {{ data.byTeam?.length || 0 }}</div>
        </div>
      </div>
    </template>
  </UPageCard>
</template>

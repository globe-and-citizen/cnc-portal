<script setup lang="ts">
import type { WagesStats } from '~/types'

defineProps<{
  data: WagesStats | null | undefined
  isLoading: boolean
}>()
</script>

<template>
  <UPageCard title="Wages Statistics" variant="subtle">
    <template v-if="isLoading">
      <USkeleton class="h-32 w-full" />
    </template>
    <template v-else-if="data">
      <div class="space-y-4">
        <p class="text-muted">
          Coming soon: Detailed wages statistics and analytics
        </p>
        <div class="text-sm space-y-2">
          <div>Total Wages: {{ data.totalWages }}</div>
          <div>Total Distributions: {{ data.totalDistributions }}</div>
        </div>
      </div>
    </template>
  </UPageCard>
</template>

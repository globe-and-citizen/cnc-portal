<script setup lang="ts">
import { formatTokenUnits } from '@/utils/format'

defineProps<{
  activeCount: number
  totalBudget: bigint
  availableBudget: bigint
}>()
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-3">
    <UCard variant="subtle">
      <p class="text-muted text-sm">Active campaigns</p>
      <p class="text-highlighted mt-1 text-2xl font-semibold">{{ activeCount }}</p>
    </UCard>
    <UCard variant="subtle">
      <p class="text-muted text-sm">Total funded</p>
      <p class="text-highlighted mt-1 text-2xl font-semibold">
        {{ formatTokenUnits(totalBudget, 18, 'POL') }}
      </p>
    </UCard>
    <UCard variant="subtle">
      <p class="text-muted text-sm">Budget available</p>
      <p class="text-highlighted mt-1 text-2xl font-semibold">
        {{ formatTokenUnits(availableBudget, 18, 'POL') }}
      </p>
    </UCard>
  </div>
</template>

<template>
  <div class="flex flex-wrap gap-1">
    <UBadge
      v-for="leg in legs"
      :key="leg.asset"
      color="neutral"
      variant="subtle"
      size="sm"
      data-test="safe-swap-leg"
    >
      {{ formatToken(leg.quantity, leg.symbol) }}
    </UBadge>
  </div>
</template>

<script setup lang="ts">
import { formatToken } from '@/utils/format'
import type { SafeSwapLeg } from '@/utils/safe/swapPnl'

defineProps<{ legs: SafeSwapLeg[] }>()
</script>

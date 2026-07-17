<script setup lang="ts">
import { computed } from 'vue'
import {
  formatNative,
  formatToken,
  type TeamBalanceBreakdown
} from '~/composables/useTeamsBalanceRecaps'

const props = defineProps<{
  recap: TeamBalanceBreakdown
}>()

// Keep only contracts that actually hold something, with their non-zero lines.
const rows = computed(() =>
  props.recap.contracts
    .map(contract => ({
      address: contract.address,
      type: contract.type,
      lines: [
        ...(contract.native > 0n ? [{ amount: formatNative(contract.native), symbol: 'POL' }] : []),
        ...contract.tokens
          .filter(t => t.raw > 0n)
          .map(t => ({ amount: formatToken(t), symbol: t.symbol }))
      ]
    }))
    .filter(c => c.lines.length > 0)
)
</script>

<template>
  <USkeleton v-if="recap.loading" class="h-4 w-28" />
  <span v-else-if="rows.length === 0" class="text-sm text-dimmed">—</span>
  <div v-else class="flex flex-col gap-1.5">
    <div v-for="contract in rows" :key="contract.address" class="flex flex-col">
      <span class="text-xs font-medium text-muted">{{ contract.type }}</span>
      <div class="flex flex-wrap gap-x-2 font-mono text-sm tabular-nums">
        <span v-for="line in contract.lines" :key="line.symbol">
          {{ line.amount }} <span class="text-dimmed">{{ line.symbol }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

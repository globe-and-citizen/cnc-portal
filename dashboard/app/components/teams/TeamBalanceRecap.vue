<script setup lang="ts">
import { computed } from 'vue'
import { formatEther, formatUnits } from 'viem'
import { useTeamBalanceRecap } from '~/composables/useTeamBalanceRecap'

const props = defineProps<{
  teamId: number
}>()

const { data: recap, isLoading } = useTeamBalanceRecap(() => props.teamId)

const fmt = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 })

// Compact list of non-zero holdings across the team's value-holding contracts.
const lines = computed(() => {
  if (!recap.value) return []
  const out: { key: string, amount: string, symbol: string }[] = []
  const native = Number(formatEther(recap.value.native))
  if (native > 0) out.push({ key: 'POL', amount: fmt(native), symbol: 'POL' })
  for (const token of recap.value.tokens) {
    if (token.raw > 0n) {
      out.push({
        key: token.symbol,
        amount: fmt(Number(formatUnits(token.raw, token.decimals))),
        symbol: token.symbol
      })
    }
  }
  return out
})
</script>

<template>
  <USkeleton v-if="isLoading" class="h-4 w-24" />
  <span v-else-if="lines.length === 0" class="text-sm text-dimmed">—</span>
  <div v-else class="flex flex-col gap-0.5 font-mono text-sm tabular-nums">
    <span v-for="line in lines" :key="line.key">
      {{ line.amount }} <span class="text-dimmed">{{ line.symbol }}</span>
    </span>
  </div>
</template>

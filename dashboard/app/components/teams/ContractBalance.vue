<script setup lang="ts">
import { computed } from 'vue'
import { formatEther } from 'viem'
import { useContractBalanceQuery } from '~/queries/contractBalance.query'

const props = defineProps<{
  address: string
}>()

const { data: balance, isLoading } = useContractBalanceQuery(() => props.address)

// Trim to 4 decimals; keep it compact for a table cell.
const formatted = computed(() => {
  if (balance.value === null || balance.value === undefined) return null
  const value = Number(formatEther(balance.value))
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 })
})
</script>

<template>
  <USkeleton v-if="isLoading" class="h-4 w-16" />
  <span v-else-if="formatted === null" class="text-sm text-dimmed">—</span>
  <span v-else class="font-mono text-sm tabular-nums">
    {{ formatted }} <span class="text-dimmed">POL</span>
  </span>
</template>

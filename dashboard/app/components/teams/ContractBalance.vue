<script setup lang="ts">
import { computed } from 'vue'
import { formatEther } from 'viem'
import { useContractBalanceQuery } from '~/queries/contractBalance.query'
import { useContractTokenBalancesQuery } from '~/queries/contractTokenBalances.query'

const props = defineProps<{
  address: string
}>()

const { data: native, isLoading: nativeLoading } = useContractBalanceQuery(() => props.address)
const { data: tokens, isLoading: tokensLoading } = useContractTokenBalancesQuery(() => props.address)

const isLoading = computed(() => nativeLoading.value || tokensLoading.value)

// Trim to 4 decimals; keep it compact for a table cell.
const nativeFormatted = computed(() => {
  if (native.value === null || native.value === undefined) return null
  const value = Number(formatEther(native.value))
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 })
})

const hasNative = computed(() => nativeFormatted.value !== null && native.value !== 0n)
const tokenBalances = computed(() => tokens.value ?? [])
const isEmpty = computed(() => !hasNative.value && tokenBalances.value.length === 0)
</script>

<template>
  <USkeleton v-if="isLoading" class="h-4 w-20" />
  <span v-else-if="isEmpty" class="text-sm text-dimmed">—</span>
  <div v-else class="flex flex-col gap-0.5 font-mono text-sm tabular-nums">
    <span v-if="hasNative">
      {{ nativeFormatted }} <span class="text-dimmed">POL</span>
    </span>
    <span v-for="token in tokenBalances" :key="token.address">
      {{ token.formatted }} <span class="text-dimmed">{{ token.symbol }}</span>
    </span>
  </div>
</template>

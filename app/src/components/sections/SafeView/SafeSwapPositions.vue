<template>
  <div>
    <div class="overflow-x-auto">
      <UTable :data="positions" :columns="columns" data-test="safe-swap-positions">
        <template #symbol-cell="{ row: { original: token } }">
          <span class="font-medium">{{ token.symbol }}</span>
          <UBadge
            v-if="!token.quantity"
            color="neutral"
            variant="subtle"
            size="sm"
            class="ml-2"
            data-test="safe-swap-position-closed"
          >
            No longer held
          </UBadge>
        </template>
        <template #quantity-cell="{ row: { original: token } }">
          {{ formatNumber(token.quantity) }}
        </template>
        <template #averageCostUsd-cell="{ row: { original: token } }">
          {{ formatUsd(token.averageCostUsd) }}
        </template>
        <template #costUsd-cell="{ row: { original: token } }">
          {{ token.quantity ? formatUsd(token.costUsd) : EMPTY_VALUE }}
        </template>
        <template #priceUsd-cell="{ row: { original: token } }">
          {{ formatUsd(token.priceUsd) }}
        </template>
        <template #pnlUsd-cell="{ row: { original: token } }">
          <SafePnlAmount :value="token.pnlUsd" class="font-medium" />
        </template>
        <template #history-cell="{ row: { original: token } }">
          <UButton
            variant="link"
            size="xs"
            :label="selectedAsset === token.asset ? 'Hide' : 'History'"
            :data-test="`safe-swap-history-${token.symbol}`"
            @click="toggleHistory(token.asset)"
          />
        </template>
      </UTable>
    </div>

    <SafeSwapPositionHistory v-if="selected" :position="selected" class="mt-4" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import SafePnlAmount from './SafePnlAmount.vue'
import SafeSwapPositionHistory from './SafeSwapPositionHistory.vue'
import { EMPTY_VALUE, formatNumber, formatUsd } from '@/utils/format'
import type { SafeTokenPosition } from '@/utils/safe/costBasis'

const props = defineProps<{ positions: SafeTokenPosition[] }>()

const columns: TableColumn<SafeTokenPosition>[] = [
  { accessorKey: 'symbol', header: 'Token' },
  { accessorKey: 'quantity', header: 'Quantity held' },
  { accessorKey: 'averageCostUsd', header: 'Average buy price' },
  { accessorKey: 'costUsd', header: 'Total cost' },
  { accessorKey: 'priceUsd', header: 'Price today' },
  { accessorKey: 'pnlUsd', header: 'P&L' },
  { id: 'history', header: '' }
]

const selectedAsset = ref<string | null>(null)
const selected = computed(() => props.positions.find(({ asset }) => asset === selectedAsset.value))

const toggleHistory = (asset: string) => {
  selectedAsset.value = selectedAsset.value === asset ? null : asset
}
</script>

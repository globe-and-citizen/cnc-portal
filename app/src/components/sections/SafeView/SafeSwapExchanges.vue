<template>
  <div class="overflow-x-auto">
    <UTable :data="newestFirst" :columns="columns" data-test="safe-swaps-table">
      <template #executionDate-cell="{ row: { original: swap } }">
        <span class="text-sm text-gray-600">{{ formatDateShort(swap.executionDate) }}</span>
      </template>
      <template #exchange-cell="{ row: { original: swap } }">
        <div class="flex flex-wrap items-center gap-1">
          <UBadge
            v-for="leg in swap.given"
            :key="leg.asset"
            color="neutral"
            variant="subtle"
            size="sm"
            data-test="safe-swap-given"
          >
            {{ formatToken(leg.quantity, leg.symbol) }}
          </UBadge>
          <UIcon name="i-lucide-arrow-right" class="mx-1 h-4 w-4 text-gray-400" />
          <UBadge
            v-for="leg in swap.received"
            :key="leg.asset"
            color="neutral"
            variant="subtle"
            size="sm"
            data-test="safe-swap-received"
          >
            {{ formatToken(leg.quantity, leg.symbol) }}
          </UBadge>
        </div>
      </template>
      <template #valueUsd-cell="{ row: { original: swap } }">
        {{ formatUsd(swap.valueUsd) }}
      </template>
      <template #fee-cell="{ row: { original: swap } }">
        <span v-if="swap.fee" data-test="safe-swap-row-fee">
          {{ formatToken(swap.fee.quantity, swap.fee.symbol) }}
          <span class="block text-xs text-gray-500">{{ formatUsd(swap.fee.usd) }}</span>
        </span>
        <span v-else class="text-gray-400">—</span>
      </template>
      <template #txHash-cell="{ row: { original: swap } }">
        <AddressTooltip :address="swap.txHash" type="transaction" slice />
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import { formatDateShort } from '@/utils/dates/calendar'
import { formatToken, formatUsd } from '@/utils/format'
import type { SafeSwapExchange } from '@/utils/safe/costBasis'

const props = defineProps<{ swaps: SafeSwapExchange[] }>()

const columns: TableColumn<SafeSwapExchange>[] = [
  { accessorKey: 'executionDate', header: 'Date' },
  { id: 'exchange', header: 'Exchange' },
  { accessorKey: 'valueUsd', header: 'Value on swap day' },
  { accessorKey: 'fee', header: 'Fee' },
  { accessorKey: 'txHash', header: 'On-chain transaction' }
]

const newestFirst = computed(() =>
  [...props.swaps].sort(
    (a, b) => new Date(b.executionDate).getTime() - new Date(a.executionDate).getTime()
  )
)
</script>

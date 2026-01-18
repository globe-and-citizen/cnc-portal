<template>
  <div>
    <!-- Filter Tabs - Just like the example -->
    <div class="form-control flex flex-row gap-1 mb-4 justify-start">
      <label class="label cursor-pointer flex gap-2" :key="status" v-for="status in statuses">
        <span class="label-text">{{ getStatusLabel(status) }}</span>
        <input
          type="radio"
          name="trade-filter"
          class="radio checked:bg-primary"
          :data-test="`status-input-${status}`"
          :id="status"
          :value="status"
          v-model="selectedStatus"
        />
      </label>
    </div>

    <div class="card bg-base-100 w-full">
      <TableComponent :rows="filteredTrades" :columns="columns" :loading="loading">
        <!-- Market column with truncated text -->
        <template #market-data="{ row }">
          <span class="line-clamp-1 max-w-[250px]">{{ row.market }}</span>
        </template>

        <!-- Position column with badge -->
        <template #position-data="{ row }">
          <span class="badge badge-outline font-mono">
            {{ row.outcome }}
          </span>
        </template>

        <!-- Shares column -->
        <template #shares-data="{ row }">
          <span class="font-mono">{{ row.shares }}</span>
        </template>

        <!-- Entry price column -->
        <template #entryPrice-data="{ row }">
          <span class="font-mono text-gray-500">${{ row.entryPrice.toFixed(2) }}</span>
        </template>

        <!-- P&L column with conditional styling -->
        <template #pnlPercent-data="{ row }">
          <span
            :class="[
              'font-mono font-semibold',
              row.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'
            ]"
          >
            {{ row.pnlPercent >= 0 ? '+' : '' }}{{ row.pnlPercent.toFixed(2) }}%
          </span>
        </template>

        <!-- Status column with badges -->
        <template #status-data="{ row }">
          <span v-if="row.status === 'open'" class="badge bg-info/20 text-info border-info/30">
            Open
          </span>
          <span
            v-else-if="row.result === 'won'"
            class="badge bg-green-500/20 text-green-500 border-green-500/30"
          >
            Won
          </span>
          <span v-else class="badge bg-red-500/20 text-red-500 border-red-500/30"> Lost </span>
        </template>

        <!-- Action column with conditional buttons -->
        <template #action-data="{ row }">
          <button
            v-if="row.status === 'open'"
            @click="$emit('sell', row)"
            class="btn btn-sm btn-error gap-1.5"
            :data-test="`sell-button-${row.id}`"
          >
            <icon icon="heroicons:arrow-trending-down" class="w-3.5 h-3.5" />
            Sell
          </button>
          <button
            v-else
            @click="$emit('withdraw', row)"
            :disabled="row.result === 'lost' || !row.redeemable"
            class="btn btn-sm btn-outline gap-1.5"
            :data-test="`withdraw-button-${row.id}`"
          >
            <icon icon="heroicons:wallet" class="w-3.5 h-3.5" />
            Withdraw
          </button>
        </template>
      </TableComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import type { Trade } from '@/types/trading'

interface Props {
  trades: Trade[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

defineEmits(['sell', 'withdraw'])

// Array of statuses just like the example
const statuses = ['all', 'open', 'resolved']

// Selected status ref just like the example
const selectedStatus = ref<'all' | 'open' | 'resolved'>('all')

// Calculate P&L percentage for each trade
// const tradesWithPnlPercent = computed(() => {
//   return props.trades.map((trade) => ({
//     ...trade,
//     pnlPercent: ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100
//   }))
// })

const tradesWithPnlPercent = computed(() => {
  return props.trades.map((trade) => {
    let pnlPercent = 0

    if (trade.status === 'resolved') {
      // Logic for Closed/Resolved Positions
      // Cost Basis = Exit Value - Net Profit
      const costBasis = trade.shares * trade.entryPrice
      // Alternative using raw API fields if mapping manually:
      // costBasis = totalBought - realizedPnl

      if (costBasis > 0) {
        pnlPercent = (trade.pnl / costBasis) * 100
      }
    } else {
      // Logic for Open Positions
      // Simple price-to-price comparison
      if (trade.entryPrice > 0) {
        pnlPercent = ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100
      }
    }

    return {
      ...trade,
      pnlPercent //: parseFloat(pnlPercent.toFixed(2))
    }
  })
})

// Filter trades based on selected status - just like the example
const filteredTrades = computed(() => {
  if (selectedStatus.value === 'all') {
    return tradesWithPnlPercent.value
  } else {
    return tradesWithPnlPercent.value.filter((trade) => trade.status === selectedStatus.value)
  }
})

// Helper to format status labels
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    all: 'All',
    open: 'Open',
    resolved: 'Resolved'
  }
  return labels[status] || status.charAt(0).toUpperCase() + status.slice(1)
}

// Table columns definition
const columns: TableColumn[] = [
  {
    key: 'market',
    label: 'Market',
    sortable: true
  },
  {
    key: 'position',
    label: 'Position',
    sortable: true
  },
  {
    key: 'shares',
    label: 'Shares',
    sortable: true,
    align: 'right'
  },
  {
    key: 'entryPrice',
    label: 'Entry',
    sortable: true,
    align: 'right'
  },
  {
    key: 'pnlPercent',
    label: 'P&L',
    sortable: true,
    align: 'right'
  },
  {
    key: 'status',
    label: 'Status',
    sortable: false
  },
  {
    key: 'action',
    label: 'Action',
    sortable: false,
    align: 'right'
  }
]
</script>

<style scoped>
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}
</style>

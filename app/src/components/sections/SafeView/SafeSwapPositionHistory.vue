<template>
  <div
    class="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
    data-test="safe-swap-position-history"
  >
    <p class="mb-2 text-sm font-medium">{{ position.symbol }} history</p>
    <div class="overflow-x-auto">
      <UTable :data="rows" :columns="columns">
        <template #date-cell="{ row: { original: row } }">
          <span class="text-sm text-gray-600">
            {{ row.date ? formatDateShort(row.date) : 'Today' }}
          </span>
        </template>
        <template #priceUsd-cell="{ row: { original: row } }">
          {{ formatUsd(row.priceUsd) }}
        </template>
        <template #quantity-cell="{ row: { original: row } }">
          {{ formatNumber(row.quantity) }}
        </template>
        <template #pnlUsd-cell="{ row: { original: row } }">
          <SafePnlAmount :value="row.pnlUsd" />
        </template>
      </UTable>
    </div>
    <p class="mt-2 text-xs text-gray-500" data-test="safe-swap-position-pnl">
      P&L: <SafePnlAmount :value="position.pnlUsd" class="font-medium" />
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import SafePnlAmount from './SafePnlAmount.vue'
import { formatDateShort } from '@/utils/dates/calendar'
import { formatNumber, formatToken, formatUsd } from '@/utils/format'
import type {
  SafeCostBasisEvent,
  SafeSwapExchange,
  SafeTokenPosition
} from '@/utils/safe/costBasis'
import type { SafeAssetAmount } from '@/utils/safe/swapTransfers'

const props = defineProps<{ position: SafeTokenPosition }>()

/** One line of the history: a quantity of the token, its price, and the result it fixed. */
interface HistoryRow {
  /** Execution date; null for today's valuation of what is still held. */
  date: string | null
  operation: string
  priceUsd: number | null
  quantity: number
  pnlUsd: number | null
}

type SwapEvent = SafeCostBasisEvent & { swap: SafeSwapExchange }

const columns = computed<TableColumn<HistoryRow>[]>(() => [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'operation', header: 'Operation' },
  { accessorKey: 'priceUsd', header: `${props.position.symbol} price` },
  { accessorKey: 'quantity', header: 'Quantity' },
  { accessorKey: 'pnlUsd', header: 'P&L' }
])

const amounts = (side: readonly SafeAssetAmount[]) =>
  side.map(({ quantity, symbol }) => formatToken(quantity, symbol)).join(' + ')

const operationOf = ({ kind, swap, quantity }: SwapEvent) =>
  kind === 'fee'
    ? `Fee · ${formatToken(quantity, props.position.symbol)}`
    : `Swap · ${amounts(swap.given)} → ${amounts(swap.received)}`

/** Deposits and payments are listed with the Safe's transactions; the history keeps the swaps and their fees. */
const isSwapEvent = (event: SafeCostBasisEvent): event is SwapEvent => event.swap !== null

/** What is still held, valued at today's price against its average cost. */
const todayRow = computed<HistoryRow[]>(() => {
  const { quantity, priceUsd, valueUsd, costUsd } = props.position
  if (!quantity) return []
  const pnlUsd = valueUsd === null || costUsd === null ? null : valueUsd - costUsd
  return [{ date: null, operation: '—', priceUsd, quantity, pnlUsd }]
})

/** The quantity a swap or its fee moved, at the price it was valued at. */
const eventRow = (event: SwapEvent): HistoryRow => ({
  date: event.executionDate,
  operation: operationOf(event),
  priceUsd: event.priceUsd,
  quantity: event.quantity,
  pnlUsd: event.pnlUsd
})

/** The quantity a swap starts from, standing in for the deposits and payments that led to it. */
const beforeSwapRow = (previous: SafeCostBasisEvent, swap: SwapEvent): HistoryRow => ({
  date: swap.executionDate,
  operation: `Before swap · ${formatToken(previous.quantityHeld, props.position.symbol)}`,
  priceUsd: null,
  quantity: previous.quantityHeld,
  pnlUsd: null
})

const rows = computed<HistoryRow[]>(() => [
  ...props.position.history.flatMap((event, index, history) => {
    if (!isSwapEvent(event)) return []
    const previous = history[index - 1]
    const isAfterHiddenMovement = !!previous && !isSwapEvent(previous) && previous.quantityHeld > 0
    return isAfterHiddenMovement
      ? [beforeSwapRow(previous, event), eventRow(event)]
      : [eventRow(event)]
  }),
  ...todayRow.value
])
</script>

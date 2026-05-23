<template>
  <UPageCard variant="subtle">
    <h3 class="font-semibold text-black dark:text-white mb-4">
      Positions · {{ positions.length }}
    </h3>

    <UTable
      :data="sortedPositions"
      :columns="columns"
      :loading="isLoading"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
        td: 'border-b border-default align-top',
        separator: 'h-0'
      }"
    >
      <template #empty>
        <div class="flex flex-col items-center justify-center py-8 text-muted">
          <UIcon name="i-lucide-wallet" class="w-12 h-12 mb-3 opacity-60" />
          <p v-if="!hasAddress">
            Enter a wallet address to see positions.
          </p>
          <p v-else>
            No positions found for this wallet.
          </p>
        </div>
      </template>

      <template #market-cell="{ row }">
        <div class="flex items-center gap-2 max-w-xs">
          <img
            v-if="row.original.icon"
            :src="row.original.icon"
            :alt="row.original.title ?? 'Market'"
            class="w-7 h-7 rounded object-cover shrink-0"
          >
          <a
            v-if="marketUrl(row.original)"
            :href="marketUrl(row.original)!"
            target="_blank"
            rel="noopener noreferrer"
            class="truncate hover:underline text-black dark:text-white"
          >
            {{ row.original.title ?? "—" }}
          </a>
          <span v-else class="truncate">{{ row.original.title ?? "—" }}</span>
        </div>
      </template>

      <template #outcome-cell="{ row }">
        <span class="font-semibold" :class="outcomeClass(row.original.outcome)">
          {{ row.original.outcome ?? "—" }}
        </span>
      </template>

      <template #size-cell="{ row }">
        <span class="tabular-nums">{{ formatShares(row.original.size) }}</span>
      </template>

      <template #avgPrice-cell="{ row }">
        <span class="tabular-nums">{{ formatPrice(row.original.avgPrice) }}</span>
      </template>

      <template #curPrice-cell="{ row }">
        <span class="tabular-nums">{{ formatPrice(row.original.curPrice) }}</span>
      </template>

      <template #initialValue-cell="{ row }">
        <span class="tabular-nums">{{ formatUsd(row.original.initialValue) }}</span>
      </template>

      <template #currentValue-cell="{ row }">
        <span class="tabular-nums">{{ formatUsd(row.original.currentValue) }}</span>
      </template>

      <template #cashPnl-cell="{ row }">
        <span class="tabular-nums font-medium" :class="signClass(row.original.cashPnl)">
          {{ formatSignedUsd(row.original.cashPnl) }}{{ formatPercent(row.original.percentPnl) }}
        </span>
      </template>

      <template #realizedPnl-cell="{ row }">
        <span class="tabular-nums font-medium" :class="signClass(row.original.realizedPnl)">
          {{ formatSignedUsd(row.original.realizedPnl) }}
        </span>
      </template>
    </UTable>
  </UPageCard>
</template>

<script setup lang="ts">
import type { PolymarketPosition } from '~/types/polymarket'
import { formatSignedUsd, formatUsd, signClass } from '~/utils/accounting'

const props = defineProps<{
  positions: PolymarketPosition[]
  isLoading: boolean
  hasAddress: boolean
}>()

/** Open positions first (size > 0), then by current value. */
const sortedPositions = computed(() =>
  [...props.positions].sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0))
)

const columns = [
  { accessorKey: 'market', header: 'Market' },
  { accessorKey: 'outcome', header: 'Outcome' },
  { accessorKey: 'size', header: 'Shares' },
  { accessorKey: 'avgPrice', header: 'Avg price' },
  { accessorKey: 'curPrice', header: 'Cur price' },
  { accessorKey: 'initialValue', header: 'Cost basis' },
  { accessorKey: 'currentValue', header: 'Value' },
  { accessorKey: 'cashPnl', header: 'Unrealized P&L' },
  { accessorKey: 'realizedPnl', header: 'Realized P&L' }
]

function formatShares(value: number | undefined): string {
  return value == null ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatPrice(value: number | undefined): string {
  return value == null ? '—' : `$${value.toFixed(4)}`
}

function formatPercent(value: number | undefined): string {
  return value == null ? '' : ` (${value > 0 ? '+' : ''}${value.toFixed(1)}%)`
}

function marketUrl(position: PolymarketPosition): string | null {
  const slug = position.eventSlug || position.slug
  return slug ? `https://polymarket.com/event/${slug}` : null
}

function outcomeClass(outcome: string | undefined): string {
  const normalized = outcome?.trim().toLowerCase()
  if (normalized === 'yes') {
    return 'text-emerald-600 dark:text-emerald-400'
  }
  if (normalized === 'no') {
    return 'text-rose-600 dark:text-rose-400'
  }
  return 'text-amber-600 dark:text-amber-400'
}
</script>

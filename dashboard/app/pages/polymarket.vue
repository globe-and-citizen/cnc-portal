<template>
  <div class="container mx-auto px-4 py-8">
    <div class="space-y-6">
      <UPageCard
        title="Polymarket activity"
        description="Track activity for any EOA or Safe wallet. Data is loaded directly from the Polymarket Data API in the browser."
        variant="naked"
        orientation="horizontal"
      >
        <UButton
          label="Refresh"
          color="neutral"
          icon="i-lucide-refresh-cw"
          :loading="isFetching"
          :disabled="!polymarketUserAddress.trim()"
          class="w-fit lg:ms-auto"
          @click="onRefreshClick"
        />
      </UPageCard>

      <UPageCard variant="subtle">
        <UFormField
          label="Wallet address"
          description="Stored locally in this browser. Enter an EOA or Safe address used on Polymarket."
          class="flex max-sm:flex-col justify-between items-start gap-4"
          :ui="{ container: 'w-full max-w-2xl' }"
        >
          <UInput
            v-model="polymarketUserAddress"
            class="w-full font-mono text-sm"
            placeholder="0x..."
            autocomplete="off"
          />
        </UFormField>
      </UPageCard>

      <UAlert
        v-if="isError"
        color="error"
        variant="subtle"
        title="Could not load activity"
        :description="fetchErrorMessage"
      />

      <UPageCard variant="subtle">
        <UTable
          :data="tableRows"
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
            <div
              class="flex flex-col items-center justify-center py-8 text-muted"
            >
              <UIcon
                name="i-lucide-line-chart"
                class="w-12 h-12 mb-3 opacity-60"
              />
              <p v-if="!polymarketUserAddress.trim()">
                Enter a wallet address to see Polymarket activity.
              </p>
              <p v-else>
                No rows returned for this page.
              </p>
            </div>
          </template>

          <template #marketSummary-cell="{ row }">
            <div class="max-w-lg flex items-center gap-3">
              <img
                v-if="row.original.icon"
                :src="row.original.icon"
                :alt="row.original.title ?? 'Market icon'"
                class="w-8 h-8 rounded object-cover shrink-0"
              >
              <div
                v-else
                class="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0"
              >
                <UIcon name="i-lucide-image" class="w-4 h-4 text-muted" />
              </div>

              <a
                v-if="marketUrl(row.original)"
                :href="marketUrl(row.original)!"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium truncate text-black dark:text-white hover:underline block"
              >
                {{ row.original.title ?? "—" }}
              </a>
              <div v-else class="font-medium truncate text-black dark:text-white">
                {{ row.original.title ?? "—" }}
              </div>
            </div>
          </template>

          <template #action-cell="{ row }">
            <UBadge
              :color="
                row.original.side === 'BUY'
                  ? 'success'
                  : row.original.side === 'SELL'
                    ? 'error'
                    : 'neutral'
              "
              variant="subtle"
            >
              {{ row.original.side ?? "—" }}
            </UBadge>
          </template>

          <template #outcome-cell="{ row }">
            <span
              class="font-semibold"
              :class="outcomeClass(row.original.outcome)"
            >
              {{ row.original.outcome ?? "—" }}
            </span>
          </template>

          <template #size-cell="{ row }">
            <span class="tabular-nums">
              {{ formatQuantity(row.original.size) }}
            </span>
          </template>

          <template #usdcSize-cell="{ row }">
            <span class="tabular-nums">
              {{ formatTotalUsd(row.original.usdcSize) }}
            </span>
          </template>

          <template #price-cell="{ row }">
            <span class="tabular-nums">
              {{ formatUnitPrice(row.original.price) }}
            </span>
          </template>

          <template #tx-cell="{ row }">
            <a
              v-if="transactionUrl(row.original.transactionHash)"
              :href="transactionUrl(row.original.transactionHash)!"
              target="_blank"
              rel="noopener noreferrer"
              class="font-mono text-xs text-primary hover:underline"
            >
              {{ row.original.transactionHash?.slice(0, 10) }}…
            </a>
            <span v-else class="text-muted">—</span>
          </template>
        </UTable>

        <div
          v-if="polymarketUserAddress.trim() && paginationTotal > 0"
          class="mt-4 flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="text-sm text-muted">
            <template v-if="rowCount === 0 && !isLoading">
              No rows on this page.
            </template>
            <template v-else>
              Rows {{ showingFrom }}–{{ showingTo }}
              <span v-if="hasNextPage"> · more may be available</span>
              <span v-else> · end of loaded activity</span>
            </template>
          </div>
          <UPagination
            v-model:page="currentPage"
            :items-per-page="pageSize"
            :total="paginationTotal"
            :disabled="isFetching"
            :sibling-count="1"
            show-edges
            color="neutral"
            variant="outline"
          />
        </div>
      </UPageCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { format } from 'date-fns'
import { usePolymarketActivityQuery } from '~/queries/polymarket.queries'
import type { PolymarketActivity } from '~/types/polymarket'

const polymarketUserAddress = useLocalStorage(
  'dashboard-polymarket-user-address',
  ''
)
const pageSize = 10
const currentPage = ref(1)

watch(polymarketUserAddress, () => {
  currentPage.value = 1
})

const queryParams = computed(() => ({
  user: polymarketUserAddress.value,
  limit: pageSize,
  offset: (currentPage.value - 1) * pageSize,
  sortBy: 'TIMESTAMP' as const,
  sortDirection: 'DESC' as const
}))

const { data, isLoading, isFetching, error, refetch, isError }
  = usePolymarketActivityQuery(queryParams)

function formatActivityTime(ts: number | undefined): string {
  if (ts == null) {
    return '—'
  }
  const ms = ts < 1e12 ? ts * 1000 : ts
  return format(new Date(ms), 'MMM d, yyyy HH:mm')
}

function transactionUrl(hash: string | undefined): string | null {
  if (!hash) {
    return null
  }
  return `https://polygonscan.com/tx/${hash}`
}

function marketUrl(row: PolymarketActivity): string | null {
  const slug = row.eventSlug || row.slug
  if (!slug) {
    return null
  }
  return `https://polymarket.com/event/${slug}`
}

function formatQuantity(size: number | undefined): string {
  if (size == null) {
    return '—'
  }
  return size.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function formatUnitPrice(price: number | undefined): string {
  if (price == null) {
    return '—'
  }
  return `$${price.toFixed(4)}`
}

function formatTotalUsd(value: number | undefined): string {
  if (value == null) {
    return '—'
  }
  return `$${value.toFixed(2)}`
}

function outcomeClass(outcome: string | undefined): string {
  if (!outcome) {
    return 'text-muted'
  }
  const normalized = outcome.trim().toLowerCase()
  if (normalized === 'yes') {
    return 'text-emerald-600 dark:text-emerald-400'
  }
  if (normalized === 'no') {
    return 'text-rose-600 dark:text-rose-400'
  }
  return 'text-amber-600 dark:text-amber-400'
}

interface ActivityRow extends PolymarketActivity {
  id: string
  formattedTime: string
}

const tableRows = computed<ActivityRow[]>(() => {
  const rows = data.value ?? []
  return rows.map((row, index) => ({
    ...row,
    id: `${row.transactionHash ?? 'row'}-${row.timestamp ?? index}-${index}`,
    formattedTime: formatActivityTime(row.timestamp)
  }))
})

const rowCount = computed(() => data.value?.length ?? 0)
const hasNextPage = computed(() => rowCount.value === pageSize)

const paginationTotal = computed(() => {
  if (!polymarketUserAddress.value.trim()) {
    return 0
  }
  if (rowCount.value === 0) {
    return (currentPage.value - 1) * pageSize
  }
  const loadedThrough = (currentPage.value - 1) * pageSize + rowCount.value
  if (hasNextPage.value) {
    return loadedThrough + 1
  }
  return loadedThrough
})

const showingFrom = computed(() => {
  if (rowCount.value === 0) {
    return 0
  }
  return (currentPage.value - 1) * pageSize + 1
})

const showingTo = computed(() => {
  if (rowCount.value === 0) {
    return 0
  }
  return (currentPage.value - 1) * pageSize + rowCount.value
})

watch([paginationTotal, currentPage], () => {
  if (paginationTotal.value <= 0) {
    return
  }
  const maxPage = Math.max(1, Math.ceil(paginationTotal.value / pageSize))
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
})

const columns = [
  { accessorKey: 'formattedTime', header: 'Time' },
  { accessorKey: 'marketSummary', header: 'Market' },
  { accessorKey: 'action', header: 'Action' },
  { accessorKey: 'outcome', header: 'Outcome' },
  { accessorKey: 'size', header: 'Qty' },
  { accessorKey: 'price', header: 'Unit Price' },
  { accessorKey: 'usdcSize', header: 'Total USD' },
  { id: 'tx', header: 'Tx' }
]

const fetchErrorMessage = computed(() => {
  if (!isError.value || !error.value) {
    return ''
  }
  const err = error.value as { data?: { error?: string }, message?: string }
  if (
    typeof err.data === 'object'
    && err.data
    && 'error' in err.data
    && typeof err.data.error === 'string'
  ) {
    return err.data.error
  }
  return err.message ?? 'Failed to load activity.'
})

function onRefreshClick(): void {
  void refetch()
}
</script>

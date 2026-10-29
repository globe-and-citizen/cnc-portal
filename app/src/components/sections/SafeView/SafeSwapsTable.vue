<template>
  <UCard data-test="safe-swaps-card">
    <template #header>
      <div>
        <h3 class="font-semibold">Swaps</h3>
        <p class="mt-1 text-sm text-gray-500">
          Tokens the Safe gave up and received in each swap, valued in USD.
        </p>
      </div>
    </template>

    <UAlert
      v-if="isError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Swaps could not be loaded"
      description="Check your connection and reload the page to try again."
      data-test="safe-swaps-error"
    />

    <div
      v-else-if="isLoading || !report"
      class="flex min-h-36 items-center justify-center gap-3 text-sm text-gray-500"
      role="status"
      aria-live="polite"
      data-test="safe-swaps-loading"
    >
      <UIcon name="i-lucide-loader-circle" class="text-primary h-7 w-7 animate-spin" />
      Loading swaps…
    </div>

    <div
      v-else-if="!swaps.length"
      class="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center"
      data-test="safe-swaps-empty"
    >
      <UIcon name="i-lucide-arrow-left-right" class="text-primary h-7 w-7" />
      <p class="mt-3 font-medium">No swaps yet</p>
      <p class="mt-1 text-sm text-gray-500">Swaps made from this Safe will be listed here.</p>
    </div>

    <template v-else>
      <div class="hidden overflow-x-auto md:block">
        <UTable :data="swaps" :columns="columns" data-test="safe-swaps-table">
          <template #executionDate-cell="{ row: { original: swap } }">
            <span class="text-sm text-gray-600">{{ formatDateShort(swap.executionDate) }}</span>
          </template>
          <template #given-cell="{ row: { original: swap } }">
            <SafeSwapLegs :legs="swap.given" data-test="safe-swap-given" />
          </template>
          <template #received-cell="{ row: { original: swap } }">
            <SafeSwapLegs :legs="swap.received" data-test="safe-swap-received" />
          </template>
          <template #swappedUsd-cell="{ row: { original: swap } }">
            {{ formatUsd(swap.swappedUsd) }}
          </template>
          <template #currentUsd-cell="{ row: { original: swap } }">
            {{ formatUsd(swap.currentUsd) }}
          </template>
          <template #pnlUsd-cell="{ row: { original: swap } }">
            <span
              class="font-medium"
              :class="TREND_CLASS[trendOf(swap)]"
              :data-trend="trendOf(swap)"
              data-test="safe-swap-row-pnl"
            >
              {{ formatUsd(knownPnlUsd(swap)) }}
            </span>
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

      <ul class="space-y-3 md:hidden" data-test="safe-swaps-mobile-list">
        <li
          v-for="swap in swaps"
          :key="swap.txHash"
          class="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <SafeSwapLegs :legs="swap.given" />
              <UIcon name="i-lucide-arrow-right" class="h-4 w-4 text-gray-400" />
              <SafeSwapLegs :legs="swap.received" />
            </div>
            <span class="font-semibold" :class="TREND_CLASS[trendOf(swap)]">
              {{ formatUsd(knownPnlUsd(swap)) }}
            </span>
          </div>
          <div
            class="mt-4 flex items-center justify-between gap-3 border-t pt-3 text-xs text-gray-500 dark:border-gray-800"
          >
            <span>{{ formatDateShort(swap.executionDate) }}</span>
            <AddressTooltip :address="swap.txHash" type="transaction" slice />
          </div>
        </li>
      </ul>

      <p
        v-if="report.missingPrices.length"
        class="text-warning mt-3 text-xs"
        data-test="safe-swaps-missing-prices"
      >
        No USD price for {{ report.missingPrices.join(', ') }}: some values are unavailable.
      </p>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import SafeSwapLegs from './SafeSwapLegs.vue'
import { useSafeSwapPnl } from '@/composables/safe/useSafeSwapPnl'
import { formatDateShort } from '@/utils/dates/calendar'
import { formatToken, formatUsd } from '@/utils/format'
import type { SafeSwap } from '@/utils/safe/swapPnl'

const props = defineProps<{ address: string }>()

const { data: report, isLoading, isError } = useSafeSwapPnl(() => props.address)

const swaps = computed(() =>
  [...(report.value?.swaps ?? [])].sort(
    (a, b) => new Date(b.executionDate).getTime() - new Date(a.executionDate).getTime()
  )
)

const columns: TableColumn<SafeSwap>[] = [
  { accessorKey: 'executionDate', header: 'Date' },
  { accessorKey: 'given', header: 'Sold' },
  { accessorKey: 'received', header: 'Received' },
  { accessorKey: 'swappedUsd', header: 'Swapped value' },
  { accessorKey: 'currentUsd', header: 'Current value' },
  { accessorKey: 'pnlUsd', header: 'P&L' },
  { accessorKey: 'fee', header: 'Fee' },
  { accessorKey: 'txHash', header: 'On-chain transaction' }
]

type Trend = 'gain' | 'loss' | 'flat'
const TREND_CLASS: Record<Trend, string> = { gain: 'text-success', loss: 'text-error', flat: '' }

/** A swap's P&L is unknown as soon as one of its values is unpriced. */
const knownPnlUsd = ({ swappedUsd, currentUsd, pnlUsd }: SafeSwap) =>
  swappedUsd === null || currentUsd === null ? null : pnlUsd

/** A P&L that is unknown or rounds to zero cents is neither a gain nor a loss. */
const trendOf = (swap: SafeSwap): Trend => {
  const pnlUsd = knownPnlUsd(swap)
  return pnlUsd === null || Math.abs(pnlUsd) < 0.005 ? 'flat' : pnlUsd > 0 ? 'gain' : 'loss'
}
</script>

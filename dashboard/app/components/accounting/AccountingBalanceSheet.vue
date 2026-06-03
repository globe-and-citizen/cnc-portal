<script setup lang="ts">
import { getLocalTimeZone, today } from '@internationalized/date'
import type { LedgerEntry } from '~/utils/accounting'
import { formatSignedUsd, formatUsd, signClass } from '~/utils/accounting'
import type { RealizedTrade } from '~/utils/incomeStatement'
import type { PolymarketPosition } from '~/types/polymarket'
import type { Range } from '~/types'
import { buildBalanceSheet } from '~/utils/balanceSheet'
import { resolveBalanceSheetAsOf } from '~/utils/accountingPeriod'
import AccountingAsOfDatePicker from './AccountingAsOfDatePicker.vue'

const props = defineProps<{
  ledgerEntries: LedgerEntry[]
  realizedTrades: RealizedTrade[]
  positions: PolymarketPosition[]
  hasAddress: boolean
}>()

const tz = getLocalTimeZone()
const todayDate = today(tz).toDate(tz)

/** Selected calendar range; `null` = all-time. Defaults to today. */
const selectedRange = ref<Range | null>({ start: todayDate, end: todayDate })

const asOfContext = computed(() => resolveBalanceSheetAsOf(selectedRange.value))

const sheet = computed(() =>
  buildBalanceSheet({
    ledgerEntries: props.ledgerEntries,
    realizedTrades: props.realizedTrades,
    positions: props.positions,
    asOf: asOfContext.value.asOf
  })
)

/** The cost-basis identity holds to the cent for any date. */
const balances = computed(() => Math.abs(sheet.value.identityGap) < 0.01)
</script>

<template>
  <UPageCard variant="subtle">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div>
        <h3 class="font-semibold text-black dark:text-white">
          Balance Sheet
        </h3>
        <p class="text-sm text-muted mt-0.5">
          As of {{ asOfContext.label }}
        </p>
      </div>
      <AccountingAsOfDatePicker v-model="selectedRange" />
    </div>

    <div v-if="!hasAddress" class="text-muted text-center py-8">
      Enter a wallet address to generate the balance sheet.
    </div>

    <div v-else class="max-w-xl space-y-1">
      <!-- Assets -->
      <p class="text-xs uppercase tracking-wide text-muted pt-1">
        Assets
      </p>
      <div class="flex justify-between py-1.5 pl-3">
        <span>Cash (USDC)</span>
        <span class="tabular-nums">{{ formatUsd(sheet.cash) }}</span>
      </div>
      <div class="flex justify-between py-1.5 pl-3">
        <span>Open contracts <span class="text-muted text-sm">(at cost)</span></span>
        <span class="tabular-nums">{{ formatUsd(sheet.openContractsAtCost) }}</span>
      </div>
      <div class="flex justify-between py-1.5 pl-3 border-t border-default font-medium">
        <span>Total assets</span>
        <span class="tabular-nums">{{ formatUsd(sheet.totalAssets) }}</span>
      </div>

      <!-- Liabilities -->
      <p class="text-xs uppercase tracking-wide text-muted pt-3">
        Liabilities
      </p>
      <div class="flex justify-between py-1.5 pl-3">
        <span>None <span class="text-muted text-sm">(a Polymarket account carries no debt)</span></span>
        <span class="tabular-nums">{{ formatUsd(sheet.totalLiabilities) }}</span>
      </div>

      <!-- Equity -->
      <p class="text-xs uppercase tracking-wide text-muted pt-3">
        Equity
      </p>
      <div class="flex justify-between py-1.5 pl-3">
        <span>Owner capital <span class="text-muted text-sm">(net deposits)</span></span>
        <span class="tabular-nums">{{ formatUsd(sheet.ownerCapital) }}</span>
      </div>
      <div class="flex justify-between py-1.5 pl-3">
        <span>Retained earnings <span class="text-muted text-sm">(realized P&L + rewards)</span></span>
        <span class="tabular-nums" :class="signClass(sheet.retainedEarnings)">
          {{ formatSignedUsd(sheet.retainedEarnings) }}
        </span>
      </div>
      <div class="flex justify-between py-1.5 pl-3 border-t border-default font-medium">
        <span>Total equity</span>
        <span class="tabular-nums">{{ formatUsd(sheet.totalEquity) }}</span>
      </div>

      <!-- Balancing identity -->
      <div
        class="flex justify-between py-3 mt-2 border-t-2 border-default font-bold"
        :class="balances ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'"
      >
        <span class="flex items-center gap-2">
          <UIcon :name="balances ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'" class="w-4 h-4" />
          Assets = Liabilities + Equity
        </span>
        <span class="tabular-nums">
          {{ formatUsd(sheet.totalAssets) }} = {{ formatUsd(sheet.totalLiabilities + sheet.totalEquity) }}
        </span>
      </div>

      <!-- Mark-to-market memo (only meaningful as of today) -->
      <p v-if="asOfContext.isCurrent" class="text-xs text-muted pt-2">
        Memo — open contracts at current market value:
        {{ formatUsd(sheet.openContractsMarketValue) }}
        (unrealized P&L {{ formatSignedUsd(sheet.unrealizedPnl) }}).
        Contracts are carried at cost above so the statement balances for any date.
      </p>
      <p v-else class="text-xs text-muted pt-2">
        Mark-to-market memo is only available for the current date.
        Contracts are carried at cost above so the statement balances for any selected date.
      </p>
    </div>
  </UPageCard>
</template>

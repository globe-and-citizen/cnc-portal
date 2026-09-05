<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-end">
      <AccountingExportBar @export="onExport" @print="onPrint" />
    </div>

    <UCard class="w-full">
      <template #header>
        <div class="flex flex-wrap items-center gap-2.5">
          <span
            class="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg"
          >
            <UIcon name="i-heroicons-calculator" class="size-4.5" />
          </span>
          <span class="text-[15px] font-semibold">Trial balance</span>
          <UBadge
            :color="trial.balanced ? 'success' : 'warning'"
            variant="soft"
            :icon="trial.balanced ? 'i-heroicons-check' : 'i-heroicons-exclamation-triangle'"
            :label="trial.balanced ? 'In balance' : 'Out of balance'"
            class="rounded-full"
          />
          <DatePicker
            v-model="asOf"
            mode="date"
            storage-key="cnc-accounting-trial-asof"
            class="ml-auto"
          />
        </div>
      </template>

      <UTable
        :data="tableRows"
        :columns="columns"
        :ui="{ tr: 'group' }"
        :meta="{ class: { tr: rowClass } }"
        @select="onRowSelect"
      >
        <template #account-cell="{ row: { original: row } }">
          <span v-if="row.isTotal" class="font-extrabold">{{ row.label }}</span>
          <div v-else class="flex w-full items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                class="focus-visible:ring-neutral truncate rounded font-semibold focus-visible:ring-2 focus-visible:outline-none"
                :data-test="`drilldown-${row.label}`"
                @click.stop="openDrilldown(row)"
              >
                {{ row.label }}
              </button>
              <UTooltip
                v-if="row.split && row.account?.resolution === 'resolved' && !row.isPrimaryInstance"
                :text="REDEPLOY_HINT"
                :data-test="`redeploy-hint-${row.label}`"
              >
                <UIcon
                  name="i-heroicons-information-circle"
                  class="text-warning size-4 flex-shrink-0 cursor-help"
                />
              </UTooltip>
            </div>
            <span
              class="bg-neutral/10 text-neutral inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
            >
              <UIcon name="i-heroicons-magnifying-glass" class="size-3.5" />
              Details
            </span>
          </div>
        </template>
        <template #nature-cell="{ row: { original: row } }">
          <span
            v-if="!row.isTotal"
            class="rounded-full px-2 py-0.5 text-xs font-medium"
            :class="row.natureClass"
          >
            {{ row.nature }}
          </span>
        </template>
        <template #dr-header>
          <div class="text-right">Debit</div>
        </template>
        <template #dr-cell="{ row: { original: row } }">
          <div
            class="text-right tabular-nums"
            :class="[
              row.isTotal ? 'font-extrabold' : '',
              !row.isTotal && row.drMuted ? 'text-dimmed' : ''
            ]"
          >
            {{ row.dr }}
          </div>
        </template>
        <template #cr-header>
          <div class="text-right">Credit</div>
        </template>
        <template #cr-cell="{ row: { original: row } }">
          <div
            class="text-right tabular-nums"
            :class="[
              row.isTotal ? 'font-extrabold' : '',
              !row.isTotal && row.crMuted ? 'text-dimmed' : ''
            ]"
          >
            {{ row.cr }}
          </div>
        </template>
      </UTable>
    </UCard>

    <LedgerDrilldownModal
      v-model:open="drilldownOpen"
      :account="drilldownLine?.label ?? ''"
      :total="drilldownLine?.total ?? ''"
      :entries="drilldownEntries"
      :all-entries="accounting.journal.value"
      :balance="drilldownBalance"
      columns-storage-key="cnc-accounting-drilldown-columns-v1"
      @export="onDrilldownExport"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { TableColumn, TableRow } from '@nuxt/ui'
import DatePicker from '@/components/ui/DatePicker.vue'
import AccountingExportBar from './AccountingExportBar.vue'
import LedgerDrilldownModal from './LedgerDrilldownModal.vue'
import { defaultValueForMode } from '@/utils/dates/picker'
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import { useSectionExport } from '@/composables/accounting/useSectionExport'
import { useLedgerDrilldown } from '@/composables/accounting/useLedgerDrilldown'
import type { Account } from '@/utils/accounting/accountRegistry'
import { buildGeneralLedger } from '@/utils/accounting/generalLedger'
import { filterByPeriod, presentTrial } from '@/utils/accounting/presenter'

interface TrialTableRow {
  /** Canonical concrete account. Absent only on the total row. */
  account?: Account
  /** Display name — differentiates later deployments and unresolved accounts. */
  label: string
  /** True when this account is split across several instances (a redeploy) — shows the hint. */
  split?: boolean
  /** True on the earliest resolved deployment row. */
  isPrimaryInstance?: boolean
  nature: string
  natureClass: string
  dr: string
  cr: string
  drMuted: boolean
  crMuted: boolean
  isTotal: boolean
}

// Shown on the hint icon beside a redeployed pocket's later line(s) — not the
// original deployment. It explains why the account reads as several numbered lines.
const REDEPLOY_HINT =
  'This account was redeployed to a new contract. This line is that later deployment and shows only its own transactions.'

// Point-in-time "as of" date (date mode) — defaults to end of today. The trial
// balance is rebuilt from the slice of entries up to this date.
const asOf = ref<Date>(defaultValueForMode('date') as Date)

const accounting = useAccountingContext()
const trial = computed(() =>
  presentTrial(buildGeneralLedger(filterByPeriod(accounting.journal.value, null, asOf.value)))
)

const tableRows = computed<TrialTableRow[]>(() => [
  ...trial.value.rows.map((row) => ({ ...row, isTotal: false })),
  {
    label: 'Total',
    split: false,
    nature: '',
    natureClass: '',
    dr: trial.value.total,
    cr: trial.value.total,
    drMuted: false,
    crMuted: false,
    isTotal: true
  }
])

const columns: TableColumn<TrialTableRow>[] = [
  { id: 'account', accessorFn: (row) => row.label, header: 'Account' },
  { accessorKey: 'nature', header: 'Nature', meta: { class: { th: 'w-[24%]' } } },
  { accessorKey: 'dr', header: 'Debit', meta: { class: { th: 'w-[13%]' } } },
  { accessorKey: 'cr', header: 'Credit', meta: { class: { th: 'w-[13%]' } } }
]

// On hover, a soft rounded-pill fill (matching the Income / Balance statement
// rows): the fill sits on the cells so the first / last round into a pill, and
// no full-width band or accent bar.
function rowClass(row: TableRow<TrialTableRow>): string {
  return row.original.isTotal
    ? ''
    : 'cursor-pointer [&>td]:transition-colors [&:hover>td]:bg-elevated/60 [&>td:first-child]:rounded-l-lg [&>td:last-child]:rounded-r-lg'
}

function onRowSelect(_event: Event, row: TableRow<TrialTableRow>): void {
  if (!row.original.isTotal) openDrilldown(row.original)
}

// Per-line drill-down — over the same as-of slice the trial balance is built from.
const {
  open: drilldownOpen,
  selectedLine: drilldownLine,
  balance: drilldownBalance,
  drilldownEntries,
  openFor,
  onExport: onDrilldownExport
} = useLedgerDrilldown(accounting.journal, () => ({ from: null, to: asOf.value }))

function openDrilldown(row: TrialTableRow): void {
  if (!row.account) return
  // The line's balance sits in whichever column isn't the em-dash placeholder.
  const value = row.dr === '—' ? row.cr : row.dr
  // The concrete Account preserves a resolved deployment or the explicit
  // unresolved account without reconstructing scope from a contract address.
  openFor(row.account, value, row.label)
}

const route = useRoute()
const router = useRouter()

/**
 * Auto-open the drill-down for an account arrived at from the General Ledger
 * (`?accountId=…` with a family/contract fallback for older links). We hold off
 * until the journal is ready, then strip the query so closing the modal is final
 * and a reload does not reopen it. An account with no matching row still drills
 * directly by its chart family.
 */
watch(
  [
    () => route.query.account,
    () => route.query.instance,
    () => route.query.accountId,
    () => accounting.journal.value.length
  ],
  ([account, instance, accountId, entryCount]) => {
    if ((typeof account !== 'string' || !account) && typeof accountId !== 'string') return
    if (entryCount === 0) return
    const wanted = typeof instance === 'string' ? instance.toLowerCase() : null
    const row = tableRows.value.find(
      (candidate) =>
        !candidate.isTotal &&
        (typeof accountId === 'string'
          ? candidate.account?.id === accountId
          : candidate.account?.family.name === account &&
            (!wanted ||
              candidate.account?.contractAddress?.toLowerCase() === wanted ||
              !candidate.account?.contractAddress))
    )
    if (row) openDrilldown(row)
    else if (typeof account === 'string')
      openFor(account as import('@/utils/accounting/chartOfAccounts').AccountName, '')
    const query = { ...route.query }
    delete query.account
    delete query.instance
    delete query.accountId
    router.replace({ query })
  },
  { immediate: true }
)

// Export the current, as-of-filtered trial balance. The filename carries the
// "as of" date so a stack of exports stays distinguishable.
const { onExport, onPrint } = useSectionExport('Trial balance', () => ({
  key: 'trial',
  asOf: asOf.value
}))
</script>

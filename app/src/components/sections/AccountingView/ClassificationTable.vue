<template>
  <UCard class="w-full">
    <template #header>
      <div class="flex items-center gap-2.5">
        <span class="bg-muted text-muted flex size-7 items-center justify-center rounded-lg">
          <UIcon name="i-heroicons-tag" class="size-4.5" />
        </span>
        <span class="text-[15px] font-semibold">Transaction classification</span>
        <UBadge color="primary" variant="subtle" :label="`${rows.length} transactions`" />
      </div>
      <p class="text-muted mt-2 text-sm">
        Classify Bank and Safe deposits and withdrawals. Unclassified transactions fall back to the
        inferred category.
        <span v-if="!isOwner">Only the team owner can change a classification.</span>
      </p>
    </template>

    <div v-if="acc.isLoading.value" class="text-muted py-10 text-center text-sm">
      Loading transactions…
    </div>
    <div
      v-else-if="!rows.length"
      class="text-muted py-10 text-center text-sm"
      data-test="classify-empty"
    >
      No Bank or Safe deposits or withdrawals to classify yet.
    </div>

    <UTable v-else :data="rows" :columns="columns">
      <template #date-cell="{ row: { original: row } }">
        <span class="text-muted text-sm whitespace-nowrap tabular-nums">{{ row.date }}</span>
      </template>

      <template #description-cell="{ row: { original: row } }">
        <div class="flex flex-col">
          <span class="text-sm font-medium">{{ row.description }}</span>
          <span class="text-muted font-mono text-xs">{{ row.counterparty }}</span>
        </div>
      </template>

      <template #direction-cell="{ row: { original: row } }">
        <UBadge :color="row.direction === 'in' ? 'success' : 'warning'" variant="subtle" size="xs">
          {{ row.direction === 'in' ? 'Deposit' : 'Withdrawal' }}
        </UBadge>
      </template>

      <template #amount-header>
        <div class="text-right">Amount</div>
      </template>
      <template #amount-cell="{ row: { original: row } }">
        <div class="text-right text-sm font-semibold tabular-nums">
          {{ row.amount }}
          <span class="text-muted ml-1 font-normal">{{ row.currency }}</span>
        </div>
      </template>

      <template #classification-cell="{ row: { original: row } }">
        <LedgerClassificationCell
          v-if="isOwner"
          :entry-id="row.entryId"
          :direction="row.direction"
          :team-id="teamId"
          :category="row.category"
          :memo="row.memo"
        />
        <UBadge v-else :color="row.category ? 'primary' : 'neutral'" variant="subtle" size="xs">
          {{ row.category ? CATEGORY_LABEL[row.category] : 'Inferred' }}
        </UBadge>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { TableColumn } from '@nuxt/ui'
import LedgerClassificationCell from './LedgerClassificationCell.vue'
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import { useGetTeamQuery } from '@/queries/team.queries'
import { useUserDataStore } from '@/stores/user'
import { classificationTargetOf } from '@/utils/accounting/classificationTarget'
import { CATEGORY_LABEL, type ClassificationCategory } from '@/utils/accounting/classification'
import type { ClassificationDirection } from '@/utils/accounting/classification'
import { money, fmtDateTime, currencySymbol } from '@/utils/accounting/presenter'
import { entryLabel } from '@/utils/accounting/describeEntry'

interface ClassifyRow {
  entryId: string
  date: string
  description: string
  counterparty: string
  amount: string
  currency: string
  direction: ClassificationDirection
  category?: ClassificationCategory
  memo?: string
}

const acc = useAccountingContext()

const route = useRoute()
const teamId = computed(() => (route.params.id as string) ?? '')
const team = useGetTeamQuery({ pathParams: { teamId } })
const userStore = useUserDataStore()
const isOwner = computed(() => {
  const owner = team.data.value?.ownerAddress
  const me = userStore.address
  return !!owner && !!me && owner.toLowerCase() === me.toLowerCase()
})

/** `"0x1234…cdef"` — a counterparty shortened for the table. */
function shortAddress(value: string | undefined): string {
  return value && /^0x[0-9a-fA-F]{40}$/.test(value) ? `${value.slice(0, 6)}…${value.slice(-4)}` : ''
}

// The classifiable Bank/Safe deposits/withdrawals, newest first, mapped to table rows.
const rows = computed<ClassifyRow[]>(() =>
  acc.entries.value
    .filter((entry) => classificationTargetOf(entry) != null)
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((entry) => {
      const target = classificationTargetOf(entry)!
      return {
        entryId: entry.id,
        date: fmtDateTime(entry.timestamp),
        description: entryLabel(entry),
        counterparty: shortAddress(entry.counterparty),
        amount: money(entry.amountUsd),
        currency: currencySymbol(entry.token),
        direction: target.direction,
        category: entry.classified,
        memo: entry.classified ? entry.memo : undefined
      }
    })
)

const columns: TableColumn<ClassifyRow>[] = [
  { accessorKey: 'date', header: 'Date' },
  { id: 'description', header: 'Transaction' },
  { id: 'direction', header: 'Type' },
  { id: 'amount', header: 'Amount' },
  { id: 'classification', header: 'Classification' }
]
</script>

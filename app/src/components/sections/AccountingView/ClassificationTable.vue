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
          <span class="text-muted text-xs">{{ row.cashAccount }}</span>
        </div>
      </template>

      <template #flow-cell="{ row: { original: row } }">
        <div class="flex items-center gap-1.5">
          <UserIdentity compact size="sm" hide-address :user="nodeUser(row.flow.from)" />
          <UIcon name="i-heroicons-arrow-long-right" class="text-dimmed size-4 shrink-0" />
          <UserIdentity compact size="sm" hide-address :user="nodeUser(row.flow.to)" />
        </div>
      </template>

      <template #direction-cell="{ row: { original: row } }">
        <UBadge
          :color="row.direction === 'in' ? 'success' : 'warning'"
          variant="subtle"
          size="md"
          class="font-medium"
          :icon="
            row.direction === 'in' ? 'i-heroicons-arrow-down-left' : 'i-heroicons-arrow-up-right'
          "
        >
          {{ row.direction === 'in' ? 'Deposit' : 'Withdrawal' }}
        </UBadge>
      </template>

      <template #amount-header>
        <div class="text-right">Amount</div>
      </template>
      <template #amount-cell="{ row: { original: row } }">
        <div class="text-right text-sm font-semibold tabular-nums">{{ row.amount }}</div>
      </template>

      <template #currency-cell="{ row: { original: row } }">
        <span class="text-muted text-sm">{{ row.currency }}</span>
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
        <UBadge v-else :color="row.category ? 'primary' : 'neutral'" variant="subtle" size="md">
          {{ categoryLabel(row.category) }}
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
import UserIdentity from '@/components/ui/UserIdentity.vue'
import { useAccountingContext } from '@/composables/accounting/useAccountingContext'
import { useGetTeamQuery } from '@/queries/team.queries'
import { useUserDataStore } from '@/stores/user'
import { classificationTargetOf } from '@/utils/accounting/classificationTarget'
import { CATEGORY_LABEL, type ClassificationCategory } from '@/utils/accounting/classification'
import type { ClassificationDirection } from '@/utils/accounting/classification'
import { money, fmtDateTime, currencySymbol } from '@/utils/accounting/presenter'
import { entryLabel } from '@/utils/accounting/describeEntry'
import { useTransactionPresentation } from '@/composables/transactions/useTransactionPresentation'

/**
 * One end of a money flow: either a team cash pocket (Bank/Safe) or the external
 * party (`address`) on the other side. Resolved to an avatar + name at render time.
 */
type FlowNode = { kind: 'pocket'; account: string } | { kind: 'party'; address?: string }

interface ClassifyRow {
  entryId: string
  date: string
  description: string
  cashAccount: string
  amount: string
  currency: string
  direction: ClassificationDirection
  /** Where the money came from and went to — source on the left, destination on the right. */
  flow: { from: FlowNode; to: FlowNode }
  category?: ClassificationCategory
  memo?: string
}

const acc = useAccountingContext()
const { resolveUser } = useTransactionPresentation()

const route = useRoute()
const teamId = computed(() => (route.params.id as string) ?? '')
const team = useGetTeamQuery({ pathParams: { teamId } })
const userStore = useUserDataStore()
const isOwner = computed(() => {
  const owner = team.data.value?.ownerAddress
  const me = userStore.address
  return !!owner && !!me && owner.toLowerCase() === me.toLowerCase()
})

const categoryLabel = (category?: ClassificationCategory): string =>
  category ? CATEGORY_LABEL[category] : 'Inferred'

/** The classifiable Bank/Safe deposits and withdrawals, newest first, as table rows. */
const rows = computed<ClassifyRow[]>(() =>
  acc.entries.value
    .filter((entry) => classificationTargetOf(entry) != null)
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((entry) => {
      const target = classificationTargetOf(entry)!
      const pocket: FlowNode = { kind: 'pocket', account: target.cashAccount }
      const party: FlowNode = { kind: 'party', address: entry.counterparty }
      return {
        entryId: entry.id,
        date: fmtDateTime(entry.timestamp),
        description: entryLabel(entry),
        cashAccount: target.cashAccount,
        amount: money(entry.amountUsd),
        currency: currencySymbol(entry.token),
        direction: target.direction,
        flow: target.direction === 'in' ? { from: party, to: pocket } : { from: pocket, to: party },
        category: entry.classified,
        memo: entry.classified ? entry.memo : undefined
      }
    })
)

/** Resolve a flow endpoint to a {@link UserIdentity} user — a contract pocket or an external party. */
function nodeUser(node: FlowNode) {
  if (node.kind === 'pocket') {
    return {
      name: node.account.replace('Cash — ', ''),
      address: '',
      icon: 'heroicons:document-text'
    }
  }
  return node.address
    ? resolveUser(node.address)
    : { name: 'External wallet', address: '', icon: 'heroicons:globe-alt' }
}

const columns: TableColumn<ClassifyRow>[] = [
  { accessorKey: 'date', header: 'Date' },
  { id: 'description', header: 'Transaction' },
  { id: 'flow', header: 'Money flow' },
  { id: 'direction', header: 'Type' },
  { id: 'amount', header: 'Amount' },
  { id: 'currency', header: 'Currency' },
  { id: 'classification', header: 'Classification' }
]
</script>

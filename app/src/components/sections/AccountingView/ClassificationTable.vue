<template>
  <UCard class="w-full">
    <template #header>
      <div class="flex items-center gap-2.5">
        <span class="bg-muted text-muted flex size-7 items-center justify-center rounded-lg">
          <UIcon name="i-heroicons-tag" class="size-4.5" />
        </span>
        <span class="text-[15px] font-semibold">Transaction classification</span>
        <UBadge
          color="primary"
          variant="subtle"
          :label="`${view.entryCount} journal ${view.entryCount === 1 ? 'entry' : 'entries'}`"
          data-test="classify-count"
        />
      </div>
      <p class="text-muted mt-2 text-sm">
        Review the journal lines for external Bank and Safe withdrawals, including any fees.
        <span v-if="isOwner">You can classify individual withdrawals.</span>
        <span v-else>Only the company owner can change a classification.</span>
      </p>
    </template>

    <div
      v-if="accounting.isLoading.value"
      class="text-muted py-10 text-center text-sm"
      data-test="classify-loading"
    >
      Loading journal entries…
    </div>
    <div
      v-else-if="!view.entryCount"
      class="text-muted py-10 text-center text-sm"
      data-test="classify-empty"
    >
      No eligible external Bank or Safe withdrawals to classify yet.
    </div>

    <UTable v-else :data="view.rows" :columns="columns" data-test="classification-table">
      <template #date-cell="{ row: { original: row } }">
        <span class="text-muted text-sm whitespace-nowrap tabular-nums">{{ row.date }}</span>
      </template>

      <template #transaction-cell="{ row: { original: row } }">
        <span v-if="row.isFirst" class="text-sm font-medium">{{ row.label }}</span>
      </template>

      <template #txHash-cell="{ row: { original: row } }">
        <a
          v-if="row.isFirst && row.txHash && NETWORK.blockExplorerUrl"
          :href="`${NETWORK.blockExplorerUrl.replace(/\/$/, '')}/tx/${row.txHash}`"
          :title="row.txHash"
          :aria-label="`Open transaction ${row.txHash} in block explorer`"
          target="_blank"
          rel="noopener noreferrer"
          class="text-muted hover:text-primary font-mono text-xs underline decoration-dotted underline-offset-4"
          data-test="classify-tx-hash"
        >
          {{ formatTxHash(row.txHash) }}
        </a>
        <span v-else-if="row.isFirst" class="text-muted font-mono text-xs">
          {{ row.txHash ? formatTxHash(row.txHash) : '—' }}
        </span>
      </template>

      <template #account-cell="{ row: { original: row } }">
        <span class="text-sm" :title="row.accountInstance" data-test="classify-account">
          {{ row.accountLabel ?? row.account }}
        </span>
      </template>

      <template #currency-cell="{ row: { original: row } }">
        <span class="text-muted text-sm">{{ row.currency }}</span>
      </template>

      <template #dr-header><span class="block text-right">Debit (USD)</span></template>
      <template #dr-cell="{ row: { original: row } }">
        <span class="block text-right text-sm tabular-nums" data-test="classify-debit">{{
          row.dr
        }}</span>
      </template>

      <template #cr-header><span class="block text-right">Credit (USD)</span></template>
      <template #cr-cell="{ row: { original: row } }">
        <span class="block text-right text-sm tabular-nums" data-test="classify-credit">{{
          row.cr
        }}</span>
      </template>

      <template #classification-cell="{ row: { original: row } }">
        <template v-if="row.isFirst">
          <LedgerClassificationCell
            v-if="isOwner && row.target"
            :key="row.target.sourceEntryId"
            :target="row.target"
            :team-id="teamId"
          />
          <div v-else class="text-muted flex flex-col gap-1 text-xs">
            <span v-if="row.reviewRequired" data-test="classify-readonly">
              This journal entry combines movements and cannot be classified as one withdrawal.
            </span>
            <span v-for="(decision, index) in row.savedDecisions" :key="index">
              {{ decision }}
            </span>
            <span v-if="!row.savedDecisions.length">Inferred from source evidence</span>
          </div>
        </template>
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
import { NETWORK } from '@/constant'
import { formatTxHash } from '@/utils/format'
import {
  presentJournalClassification,
  type JournalClassificationRow
} from '@/utils/accounting/journalClassification'

const accounting = useAccountingContext()
const route = useRoute()
const teamId = computed(() => (route.params.id as string) ?? '')
const team = useGetTeamQuery({ pathParams: { teamId } })
const userStore = useUserDataStore()
const isOwner = computed(() => {
  const owner = team.data.value?.ownerAddress
  const me = userStore.address
  return !!owner && !!me && owner.toLowerCase() === me.toLowerCase()
})

const view = computed(() => presentJournalClassification(accounting.journal.value))

const columns: TableColumn<JournalClassificationRow>[] = [
  { accessorKey: 'date', header: 'Date' },
  { id: 'transaction', header: 'Transaction' },
  { id: 'txHash', header: 'Tx hash' },
  { id: 'account', header: 'Account' },
  { id: 'currency', header: 'Currency' },
  { id: 'dr', header: 'Debit (USD)' },
  { id: 'cr', header: 'Credit (USD)' },
  { id: 'classification', header: 'Classification' }
]
</script>

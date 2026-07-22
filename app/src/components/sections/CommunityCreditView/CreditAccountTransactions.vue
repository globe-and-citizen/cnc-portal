<template>
  <UCard class="w-full" data-test="credit-transactions">
    <template #header>
      <div class="flex items-center justify-between">
        <span>{{ roundId ? 'Round Transactions' : 'Credit Account Transactions' }}</span>
        <div class="flex items-center gap-2">
          <CustomDatePicker
            v-model="dateRange"
            class="min-w-[140px]"
            data-test-prefix="credit-transaction-history"
          />
          <USelect
            v-model="selectedType"
            :items="typeOptions"
            class="min-w-[160px]"
            data-test="credit-transaction-history-type-filter"
          />
        </div>
      </div>
    </template>

    <UTable
      v-model:expanded="expandedRows"
      :data="displayedTransactions"
      :columns="columns"
      :loading="loading"
      :get-sub-rows="getSubRows"
      :ui="{ td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default' }"
      :meta="{ class: { tr: (row) => (row.depth > 0 ? 'bg-elevated' : '') } }"
    >
      <template #date-cell="{ row }">
        <template v-if="row.depth === 0">
          <div class="font-medium">{{ formatDateRelative(String(row.original.date)) }}</div>
          <div class="text-muted text-xs">{{ formatDateUTC(String(row.original.date)) }}</div>
        </template>
        <div v-else class="text-muted text-xs">{{ formatDateUTC(String(row.original.date)) }}</div>
      </template>

      <template #tx-cell="{ row }">
        <UTooltip v-if="row.depth === 0" text="View transaction details">
          <UButton
            :label="formatTxHash(row.original.txHash)"
            trailing-icon="heroicons:arrow-top-right-on-square"
            color="primary"
            variant="outline"
            size="sm"
            data-test="credit-transaction-detail-button"
            @click="openDetail(row.original)"
          />
        </UTooltip>
        <span v-else />
      </template>

      <template #expand-cell="{ row }">
        <UButton
          v-if="row.depth === 0 && row.getCanExpand()"
          :icon="row.getIsExpanded() ? 'heroicons:chevron-down' : 'heroicons:chevron-right'"
          size="sm"
          color="primary"
          variant="soft"
          data-test="credit-transaction-expand-button"
          :aria-label="
            row.getIsExpanded() ? 'Collapse transaction events' : 'Expand transaction events'
          "
          @click="row.toggleExpanded()"
        />
        <span v-else />
      </template>

      <template #type-cell="{ row }">
        <template v-if="row.depth === 0">
          <div>
            <div class="flex items-center gap-2">
              <UBadge :color="getTransactionTypeColor(row.original.type)" variant="soft">
                {{ getTransactionTypeLabel(row.original.type) }}
              </UBadge>
              <span v-if="row.original.groupedEventCount > 1" class="text-muted text-xs">
                {{ row.original.groupedEventCount }} events
              </span>
            </div>
            <p v-if="getTransactionSummary(row.original)" class="text-muted mt-0.5 text-xs">
              {{ getTransactionSummary(row.original) }}
            </p>
            <template
              v-if="getInlineUser(row.original) || row.original.type === 'ownershipTransferred'"
            >
              <div class="mt-1 flex items-center gap-1 text-xs">
                <UserComponent :user="resolveUser(row.original.from)" />
                <span class="text-muted text-lg font-bold">→</span>
                <UserComponent :user="resolveUser(row.original.to)" />
              </div>
              <p
                v-if="getInitialTokenSupportSummary(row.original)"
                class="text-muted mt-0.5 text-xs"
              >
                {{ getInitialTokenSupportSummary(row.original) }}
              </p>
            </template>
          </div>
        </template>
        <div v-else class="pl-4">
          <div class="flex items-center gap-2">
            <UBadge :color="getTransactionTypeColor(row.original.type)" variant="soft">
              {{ getTransactionTypeLabel(row.original.type) }}
            </UBadge>
          </div>
          <p v-if="getTransactionSummary(row.original)" class="text-muted mt-0.5 text-xs">
            {{ getTransactionSummary(row.original) }}
          </p>
          <template
            v-if="getInlineUser(row.original) || row.original.type === 'ownershipTransferred'"
          >
            <div class="mt-1 flex items-center gap-1 text-xs">
              <UserComponent :user="resolveUser(row.original.from)" />
              <span class="text-muted text-lg font-bold">→</span>
              <UserComponent :user="resolveUser(row.original.to)" />
            </div>
          </template>
        </div>
      </template>

      <template #counterparty-cell="{ row }">
        <template v-if="row.depth === 0">
          <UserComponent
            v-if="getTransactionCounterparty(row.original).address"
            :user="resolveUser(getTransactionCounterparty(row.original).address!)"
          />
          <span v-else class="text-muted">—</span>
        </template>
        <span v-else class="text-muted">—</span>
      </template>

      <template #value-cell="{ row }">
        <template v-if="row.depth === 0">
          <template v-if="Number(row.original.amount) > 0">
            <div :class="getValueClass(row.original)">
              {{ getValuePrefix(row.original) }}{{ formatCryptoAmount(row.original.amount) }}
              {{ row.original.token }}
            </div>
            <div class="text-muted text-xs">
              {{ formatCurrencyShort(row.original.amountLocal, currencyStore.localCurrency.code) }}
            </div>
          </template>
          <span v-else class="text-muted">—</span>
        </template>
        <template v-else>
          <template v-if="Number(row.original.amount) > 0">
            <div class="text-sm font-medium">
              {{ formatCryptoAmount(String(row.original.amount)) }} {{ row.original.token }}
            </div>
            <div v-if="row.original.amountLocal" class="text-muted text-xs">
              {{ formatCurrencyShort(row.original.amountLocal, currencyStore.localCurrency.code) }}
            </div>
          </template>
          <span v-else class="text-muted">—</span>
        </template>
      </template>
    </UTable>

    <template #footer>
      <TablePagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        noun="transactions"
        data-test-prefix="credit-transaction"
      />
    </template>
  </UCard>

  <TransactionDetailModal v-if="selectedTx" v-model:open="showDetail" :transaction="selectedTx" />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { type Address } from 'viem'
import { useFixedReturnEventsViaLogs } from '@/composables/fixedReturn/useFixedReturnEventsViaLogs'
import UserComponent from '@/components/UserComponent.vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import TablePagination from '@/components/TablePagination.vue'
import TransactionDetailModal from '@/components/TransactionDetailModal.vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import { useTransactionTable } from '@/composables/transactions/useTransactionTable'
import { useTransactionInline } from '@/composables/transactions/useTransactionInline'
import type { CreditTransaction } from '@/types/transactions'
import {
  buildRawFixedReturnTransactions,
  formatFixedReturnTransactionDate,
  getTransactionTypeColor,
  formatCryptoAmount,
  formatCurrencyShort,
  formatEtherUtil,
  log,
  parseBigIntOrZero,
  resolveUser,
  getTransactionSummary,
  getInitialTokenSupportSummary,
  getTransactionTypeLabel,
  getTransactionCounterparty,
  formatTxHash,
  tokenSymbol,
  enrichTransaction
} from '@/utils'

import { formatDateRelative, formatDateUTC } from '@/utils/dayUtils'

const props = defineProps<{
  fixedReturnAddress: Address
  /** Scopes the feed to a single round's events — the round detail page passes
   *  its offer id here. Omitted on the Credit Account overview, which shows
   *  every round's activity together. */
  roundId?: string
}>()

const currencyStore = useCurrencyStore()
const contractAddress = computed(() => props.fixedReturnAddress.toLowerCase())

// EXPERIMENT: source the Credit Account transaction history from the RPC
// (eth_getLogs) instead of Ponder — mirrors Bank's useBankEventsViaLogs.
const { result, error, loading } = useFixedReturnEventsViaLogs(contractAddress)

const rawTransactions = computed(() => {
  const rows = buildRawFixedReturnTransactions(result.value)
  return props.roundId ? rows.filter((row) => row.offerId === props.roundId) : rows
})

const transactions = computed<CreditTransaction[]>(() =>
  rawTransactions.value.map((row) => ({
    txHash: row.txHash,
    date: formatFixedReturnTransactionDate(Number(row.timestamp)),
    from: row.from,
    to: row.to,
    amount: formatEtherUtil(parseBigIntOrZero(row.amount), row.tokenAddress),
    amountUSD: 0,
    tokenAddress: row.tokenAddress,
    token: tokenSymbol(row.tokenAddress) || 'ERC20',
    type: row.type,
    offerId: row.offerId
  }))
)

const enrichedTransactions = computed(() =>
  transactions.value.map((tx) => ({ ...tx, ...enrichTransaction(tx) }))
)

const {
  dateRange,
  selectedType,
  typeOptions,
  page,
  pageSize,
  total,
  displayedTransactions,
  expandedRows,
  getSubRows,
  selectedTx,
  showDetail,
  openDetail
} = useTransactionTable(enrichedTransactions, { key: 'creditTx' })

const { getInlineUser, getValuePrefix, getValueClass } = useTransactionInline(contractAddress)

const columns = computed(() => [
  { accessorKey: 'expand', header: '' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'counterparty', header: 'Counterparty' },
  {
    accessorKey: 'value',
    header: `Value (${currencyStore.localCurrency.code})`
  },
  { accessorKey: 'tx', header: 'Tx Hash' }
])

watch(error, (newError) => {
  if (newError) {
    log.error('Ponder credit account transaction query error:', newError)
  }
})
</script>

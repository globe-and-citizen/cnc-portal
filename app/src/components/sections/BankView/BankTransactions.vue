<template>
  <UCard class="w-full" data-test="bank-transactions">
    <template #header>
      <div class="flex items-center justify-between">
        <span>Bank Transactions History</span>
        <div class="flex items-center gap-2">
          <CustomDatePicker
            v-model="dateRange"
            class="min-w-[140px]"
            data-test-prefix="bank-transaction-history"
          />
          <USelect
            v-model="selectedType"
            :items="typeOptions"
            class="min-w-[160px]"
            data-test="bank-transaction-history-type-filter"
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
            data-test="bank-transaction-detail-button"
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
          data-test="bank-transaction-expand-button"
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
            <template v-if="getInlineUser(row.original)">
              <div class="mt-1 flex items-center gap-1 text-xs">
                <UserComponent :user="resolveUser(row.original.from)" />
                <span class="text-muted text-lg font-bold">→</span>
                <UserComponent :user="resolveUser(row.original.to)" />
              </div>
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
          <template v-if="getInlineUser(row.original)">
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
        data-test-prefix="bank-transaction"
      />
    </template>
  </UCard>

  <TransactionDetailModal v-if="selectedTx" v-model:open="showDetail" :transaction="selectedTx" />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { type Address } from 'viem'
import { GRAPHQL_POLL_INTERVAL } from '@/constant'
import { useQuery } from '@vue/apollo-composable'
import UserComponent from '@/components/UserComponent.vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import TablePagination from '@/components/TablePagination.vue'
import TransactionDetailModal from '@/components/TransactionDetailModal.vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import { useTransactionTable } from '@/composables/transactions/useTransactionTable'
import { useTransactionInline } from '@/composables/transactions/useTransactionInline'
import type { BankTransaction } from '@/types/transactions'
import {
  buildRawBankTransactions,
  formatBankTransactionDate,
  getTransactionTypeColor,
  formatCryptoAmount,
  formatCurrencyShort,
  formatEtherUtil,
  log,
  parseBigIntOrZero,
  resolveUser,
  getTransactionSummary,
  getTransactionTypeLabel,
  getTransactionCounterparty,
  formatTxHash,
  tokenSymbol,
  enrichTransaction
} from '@/utils'
import { formatDateRelative, formatDateUTC } from '@/utils/dayUtils'
import { GET_BANK_EVENTS } from '@/queries/ponder/bank.queries'
import type { BankEventsQuery } from '@/types/ponder/bank'

const props = defineProps<{
  bankAddress: Address
}>()

const currencyStore = useCurrencyStore()
const contractAddress = computed(() => props.bankAddress.toLowerCase())

const { result, error, loading } = useQuery<BankEventsQuery>(
  GET_BANK_EVENTS,
  {
    contractAddress,
    limit: 500
  },
  {
    enabled: computed(() => Boolean(contractAddress.value)),
    pollInterval: GRAPHQL_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network'
  }
)

const rawTransactions = computed(() => buildRawBankTransactions(result.value))

const transactions = computed<BankTransaction[]>(() =>
  rawTransactions.value.map((row) => ({
    txHash: row.txHash,
    date: formatBankTransactionDate(Number(row.timestamp)),
    from: row.from,
    to: row.to,
    amount: formatEtherUtil(parseBigIntOrZero(row.amount), row.tokenAddress),
    amountUSD: 0,
    tokenAddress: row.tokenAddress,
    token: tokenSymbol(row.tokenAddress) || 'ERC20',
    type: row.type
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
} = useTransactionTable(enrichedTransactions, { key: 'bankTx' })

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
    log.error('Ponder bank transaction query error:', newError)
  }
})
</script>

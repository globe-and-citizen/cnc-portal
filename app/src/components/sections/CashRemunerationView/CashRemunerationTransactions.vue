<template>
  <UCard class="w-full" data-test="cash-remuneration-transactions">
    <template #header>
      <div class="flex items-center justify-between">
        <span>Cash Remuneration Transactions History</span>
        <div class="flex items-center gap-2">
          <CustomDatePicker
            v-model="dateRange"
            class="min-w-[140px]"
            data-test-prefix="cash-remuneration-transaction-history"
          />
          <USelect
            v-model="selectedType"
            :items="typeOptions"
            class="min-w-[160px]"
            data-test="cash-remuneration-transaction-history-type-filter"
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
      :meta="{
        class: {
          tr: (row: TableRow<CashRemunerationTransaction>) => (row.depth > 0 ? 'bg-elevated' : '')
        }
      }"
    >
      <template #txHash-cell="{ row }">
        <template v-if="row.depth === 0">
          <div class="flex items-center gap-1.5">
            <UButton
              v-if="row.getCanExpand()"
              :icon="row.getIsExpanded() ? 'heroicons:chevron-down' : 'heroicons:chevron-right'"
              size="sm"
              color="primary"
              variant="soft"
              data-test="cash-remuneration-transaction-expand-button"
              :aria-label="
                row.getIsExpanded() ? 'Collapse transaction events' : 'Expand transaction events'
              "
              @click="row.toggleExpanded()"
            />
            <AddressToolTip :address="row.original.txHash" :slice="true" type="transaction" />
          </div>
        </template>
        <TransactionChildRow
          v-else
          :type="row.original.type"
          :other-address="getInlineUser(row.original)?.address ?? row.original.from"
          :amount="row.original.amount"
          :token="row.original.token"
        />
      </template>

      <template #date-cell="{ row }">
        <template v-if="row.depth === 0">
          <div class="font-medium">{{ formatDateRelative(String(row.original.date)) }}</div>
          <div class="text-muted text-xs">{{ formatDateUTC(String(row.original.date)) }}</div>
        </template>
        <span v-else />
      </template>

      <template #type-cell="{ row }">
        <div>
          <div class="flex items-center gap-2">
            <UBadge
              :color="getCashRemunerationTransactionTypeColor(row.original.type)"
              variant="soft"
            >
              {{ row.original.type }}
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
              <span v-if="getInlineUser(row.original)!.label" class="text-muted">
                {{ getInlineUser(row.original)!.label }}
              </span>
              <UserComponent
                :user="resolveUser(getInlineUser(row.original)!.address)"
                :compact="true"
              />
            </div>
          </template>
        </div>
      </template>

      <template #details-cell="{ row }">
        <UButton
          v-if="row.depth === 0"
          icon="heroicons:eye"
          size="xs"
          color="neutral"
          variant="ghost"
          data-test="cash-remuneration-transaction-detail-button"
          aria-label="View transaction details"
          @click="openDetail(row.original)"
        />
        <span v-else />
      </template>

      <template #value-cell="{ row }">
        <template v-if="row.depth === 0">
          <div :class="getValueClass(row.original)">
            {{ getValuePrefix(row.original) }}{{ formatCryptoAmount(row.original.amount) }}
            {{ row.original.token }}
          </div>
          <div class="text-muted text-xs">
            {{ formatCurrencyShort(row.original.amountLocal, currencyStore.localCurrency.code) }}
          </div>
        </template>
        <span v-else />
      </template>
    </UTable>
    <template #footer>
      <TablePagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        noun="transactions"
        data-test-prefix="cash-remuneration-transaction"
      />
    </template>
  </UCard>

  <TransactionDetailModal v-if="selectedTx" v-model:open="showDetail" :transaction="selectedTx" />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { TableRow } from '@nuxt/ui'
import {
  useTransactionTable,
  childColspan,
  childHidden
} from '@/composables/transactions/useTransactionTable'
import { useTransactionInline } from '@/composables/transactions/useTransactionInline'
import { type Address } from 'viem'
import { GRAPHQL_POLL_INTERVAL } from '@/constant'
import { useQuery } from '@vue/apollo-composable'
import AddressToolTip from '@/components/AddressToolTip.vue'
import UserComponent from '@/components/UserComponent.vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import TablePagination from '@/components/TablePagination.vue'
import TransactionDetailModal from '@/components/TransactionDetailModal.vue'
import TransactionChildRow from '@/components/TransactionChildRow.vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import type { CashRemunerationTransaction } from '@/types/transactions'
import {
  buildRawCashRemunerationTransactions,
  formatCashRemunerationTransactionDate,
  getCashRemunerationTransactionTypeColor,
  formatCryptoAmount,
  formatCurrencyShort,
  formatEtherUtil,
  parseBigIntOrZero,
  resolveUser,
  getTransactionSummary,
  log,
  tokenSymbol,
  enrichTransaction
} from '@/utils'
import { formatDateRelative, formatDateUTC } from '@/utils/dayUtils'
import { GET_INCOMING_BANK_TOKEN_TRANSFERS } from '@/queries/ponder/bank.queries'
import { GET_CASH_REMUNERATION_EVENTS } from '@/queries/ponder/cash-remuneration.queries'
import type { IncomingBankTokenTransfersQuery } from '@/types/ponder/bank'
import type { CashRemunerationEventsQuery } from '@/types/ponder/cash-remuneration'

const props = defineProps<{
  cashRemunerationAddress: Address
}>()

const currencyStore = useCurrencyStore()
const contractAddress = computed(() => props.cashRemunerationAddress.toLowerCase())

const {
  result,
  error,
  loading: cashRemunerationLoading
} = useQuery<CashRemunerationEventsQuery>(
  GET_CASH_REMUNERATION_EVENTS,
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

const {
  result: incomingTokenTransfersResult,
  error: incomingTokenTransfersError,
  loading: incomingTokenTransfersLoading
} = useQuery<IncomingBankTokenTransfersQuery>(
  GET_INCOMING_BANK_TOKEN_TRANSFERS,
  {
    toAddress: contractAddress,
    limit: 500
  },
  {
    enabled: computed(() => Boolean(contractAddress.value)),
    pollInterval: GRAPHQL_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network'
  }
)

const loading = computed(() => cashRemunerationLoading.value || incomingTokenTransfersLoading.value)

const rawTransactions = computed(() =>
  buildRawCashRemunerationTransactions(result.value, incomingTokenTransfersResult.value)
)

const transactions = computed<CashRemunerationTransaction[]>(() =>
  rawTransactions.value.map((row) => ({
    txHash: row.txHash,
    date: formatCashRemunerationTransactionDate(Number(row.timestamp)),
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
} = useTransactionTable(enrichedTransactions, { key: 'cashTx' })

const { getInlineUser, getValuePrefix, getValueClass } = useTransactionInline(contractAddress)

const columns = computed(() => [
  {
    accessorKey: 'txHash',
    header: 'Tx Hash',
    meta: { colspan: { td: childColspan } }
  },
  { accessorKey: 'date', header: 'Date', meta: { class: { td: childHidden } } },
  { accessorKey: 'type', header: 'Type', meta: { class: { td: childHidden } } },
  {
    accessorKey: 'value',
    header: `Value (${currencyStore.localCurrency.code})`,
    meta: { class: { td: childHidden } }
  },
  { accessorKey: 'details', header: '', meta: { class: { td: childHidden } } }
])

watch([error, incomingTokenTransfersError], ([newError, newIncomingTransfersError]) => {
  if (newError || newIncomingTransfersError) {
    log.error(
      'Ponder cash remuneration transaction query error:',
      newError ?? newIncomingTransfersError
    )
  }
})
</script>

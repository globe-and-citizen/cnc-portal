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
      <template #txHash-cell="{ row }">
        <template v-if="row.depth === 0">
          <div class="flex items-center gap-1.5">
            <UButton
              v-if="row.getCanExpand()"
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
            <AddressToolTip :address="row.original.txHash" :slice="true" type="transaction" />
          </div>
        </template>
        <div v-else class="pl-4">
          <div class="flex items-center gap-2">
            <UBadge :color="getBankTransactionTypeColor(row.original.type)" variant="soft">
              {{ row.original.type }}
            </UBadge>
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
            <UBadge :color="getBankTransactionTypeColor(row.original.type)" variant="soft">
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
          data-test="bank-transaction-detail-button"
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
      <TransactionTableFooter
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
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
import AddressToolTip from '@/components/AddressToolTip.vue'
import UserComponent from '@/components/UserComponent.vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import TransactionTableFooter from '@/components/TransactionTableFooter.vue'
import TransactionDetailModal from '@/components/TransactionDetailModal.vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import {
  useTransactionTable,
  childColspan,
  childHidden
} from '@/composables/transactions/useTransactionTable'
import { useTransactionInline } from '@/composables/transactions/useTransactionInline'
import type { BankTransaction } from '@/types/transactions'
import {
  buildRawBankTransactions,
  formatBankTransactionDate,
  getBankTransactionTypeColor,
  formatCryptoAmount,
  formatCurrencyShort,
  formatEtherUtil,
  log,
  parseBigIntOrZero,
  resolveUser,
  getTransactionSummary,
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
} = useTransactionTable(enrichedTransactions)

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

watch(error, (newError) => {
  if (newError) {
    log.error('Ponder bank transaction query error:', newError)
  }
})
</script>

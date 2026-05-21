<template>
  <UCard class="w-full" data-test="expense-transactions">
    <template #header>
      <div class="flex items-center justify-between">
        <span>Expense Account Transactions History</span>
        <div class="flex items-center gap-2">
          <CustomDatePicker
            v-model="dateRange"
            class="min-w-[140px]"
            data-test-prefix="expense-transaction-history"
          />
          <USelect
            v-model="selectedType"
            :items="typeOptions"
            class="min-w-[160px]"
            data-test="expense-transaction-history-type-filter"
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
    >
      <template #expand-cell="{ row }">
        <button
          v-if="row.getCanExpand()"
          type="button"
          class="text-muted hover:text-default inline-flex h-6 w-6 items-center justify-center rounded transition"
          :aria-label="row.getIsExpanded() ? 'Collapse transaction events' : 'Expand transaction events'"
          @click="row.toggleExpanded()"
        >
          {{ row.getIsExpanded() ? '−' : '+' }}
        </button>
      </template>

      <template #txHash-cell="{ row: { original: row } }">
        <AddressToolTip :address="row.txHash" :slice="true" type="transaction" />
      </template>

      <template #date-cell="{ row: { original: row } }">
        {{ formatDateShort(String(row.date)) }}
      </template>

      <template #type-cell="{ row }">
        <div class="flex items-center gap-2" :class="{ 'pl-4': row.depth > 0 }">
          <UBadge :color="getExpenseTransactionTypeColor(row.original.type)" variant="soft">
            {{ row.original.type }}
          </UBadge>
          <span
            v-if="row.depth === 0 && row.original.groupedEventCount > 1"
            class="text-muted text-xs"
          >
            {{ row.original.groupedEventCount }} events
          </span>
        </div>
      </template>

      <template #from-cell="{ row: { original: row } }">
        <AddressToolTip :address="row.from" :slice="true" type="address" />
      </template>

      <template #to-cell="{ row: { original: row } }">
        <AddressToolTip :address="row.to" :slice="true" type="address" />
      </template>

      <template #amount-cell="{ row: { original: row } }">
        {{ formatCryptoAmount(row.amount) }} {{ row.token }}
      </template>

      <template #valueLocal-cell="{ row: { original: row } }">
        {{ formatCurrencyShort(row.amountLocal, currencyStore.localCurrency.code) }}
      </template>

      <template #empty>
        <div
          v-if="hasError"
          class="text-error py-6 text-center text-sm"
          data-test="expense-transactions-error"
        >
          Failed to load transactions. Please try again later.
        </div>
        <div
          v-else
          class="py-6 text-center text-sm text-gray-500"
          data-test="expense-transactions-empty"
        >
          No transactions for the selected filters.
        </div>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { type Address } from 'viem'
import { GRAPHQL_POLL_INTERVAL, NETWORK } from '@/constant'
import { useQuery } from '@vue/apollo-composable'
import AddressToolTip from '@/components/AddressToolTip.vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import type {
  ExpenseTransactionRow,
  TransactionHistoryItemRow
} from '@/types/transaction-history'
import type { ExpenseTransaction } from '@/types/transactions'
import {
  buildRawExpenseTransactions,
  formatExpenseTransactionDate,
  getExpenseTransactionTypeColor,
  formatCryptoAmount,
  formatCurrencyShort,
  formatEtherUtil,
  groupTransactionsByTxHash,
  log,
  resolveTokenIdByAddress,
  tokenSymbol
} from '@/utils'
import { formatDateShort } from '@/utils/dayUtils'
import { GET_EXPENSE_EVENTS } from '@/queries/ponder/expense.queries'
import { GET_INCOMING_BANK_TOKEN_TRANSFERS } from '@/queries/ponder/bank.queries'
import type { IncomingBankTokenTransfersQuery } from '@/types/ponder/bank'
import type { ExpenseEventsQuery } from '@/types/ponder/expense'

const props = defineProps<{
  expenseAddress: Address
}>()

const currencyStore = useCurrencyStore()
const contractAddress = computed(() => props.expenseAddress.toLowerCase())

const {
  result,
  error,
  loading: expenseLoading
} = useQuery<ExpenseEventsQuery>(
  GET_EXPENSE_EVENTS,
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

const loading = computed(() => expenseLoading.value || incomingTokenTransfersLoading.value)
const hasError = computed(() => Boolean(error.value || incomingTokenTransfersError.value))

const parseAmount = (value: string): bigint => {
  try {
    return BigInt(value)
  } catch {
    return 0n
  }
}

const rawTransactions = computed(() =>
  buildRawExpenseTransactions(result.value, incomingTokenTransfersResult.value)
)

const transactions = computed<ExpenseTransaction[]>(() =>
  rawTransactions.value.map((row) => ({
    txHash: row.txHash,
    date: formatExpenseTransactionDate(Number(row.timestamp)),
    from: row.from,
    to: row.to,
    amount: formatEtherUtil(parseAmount(row.amount), row.tokenAddress),
    amountUSD: 0,
    tokenAddress: row.tokenAddress,
    token: tokenSymbol(row.tokenAddress) || 'ERC20',
    type: row.type
  }))
)

const dateRange = ref<[Date, Date] | null>(null)
const selectedType = ref('all')

const enrichedTransactions = computed<TransactionHistoryItemRow[]>(() => {
  return transactions.value.map((tx) => {
    const tokenAddress = String(tx.tokenAddress ?? '').toLowerCase()
    const matchedToken = currencyStore.supportedTokens.find(
      (token) => token.address.toLowerCase() === tokenAddress
    )

    const token =
      matchedToken?.symbol || tokenSymbol(tokenAddress) || tx.token || NETWORK.currencySymbol
    const tokenId = matchedToken?.id ?? resolveTokenIdByAddress(tokenAddress)
    const amount = tx.amount ?? 0
    const numericAmount = Number(amount)
    const priceInLocal = tokenId ? currencyStore.getTokenPrice(tokenId, true) : 0
    const amountLocal = Number.isFinite(numericAmount) ? numericAmount * priceInLocal : 0

    return {
      ...tx,
      amount,
      tokenAddress,
      token,
      amountLocal
    }
  })
})

const uniqueTypes = computed(() => {
  const types = new Set(enrichedTransactions.value.map((tx) => tx.type))
  return Array.from(types).sort()
})

const typeOptions = computed(() => [
  { label: 'All Types', value: 'all' },
  ...uniqueTypes.value.map((type) => ({ label: type, value: type }))
])

const filteredTransactions = computed(() => {
  let filtered = enrichedTransactions.value

  if (dateRange.value) {
    const [startDate, endDate] = dateRange.value
    filtered = filtered.filter((tx) => {
      const txDate = new Date(tx.date)
      return txDate >= startDate && txDate <= endDate
    })
  }

  if (selectedType.value !== 'all') {
    filtered = filtered.filter((tx) => tx.type === selectedType.value)
  }

  return filtered
})

const displayedTransactions = computed<ExpenseTransactionRow[]>(() => {
  return groupTransactionsByTxHash(filteredTransactions.value)
})

const expandedRows = ref<Record<string, boolean>>({})
const getSubRows = (row: ExpenseTransactionRow): ExpenseTransactionRow[] => row.subRows ?? []

const columns = computed(() => [
  { accessorKey: 'expand', header: '' },
  { accessorKey: 'txHash', header: 'Tx Hash' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'from', header: 'From' },
  { accessorKey: 'to', header: 'To' },
  { accessorKey: 'amount', header: 'Amount' },
  { accessorKey: 'valueLocal', header: `Value (${currencyStore.localCurrency.code})` }
])

watch([error, incomingTokenTransfersError], ([newError, newIncomingTransfersError]) => {
  if (newError || newIncomingTransfersError) {
    log.error('Ponder expense transaction query error:', newError ?? newIncomingTransfersError)
  }
})

watch(filteredTransactions, () => {
  expandedRows.value = {}
})
</script>

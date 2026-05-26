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
      :meta="{ class: { tr: (row) => row.depth > 0 ? 'bg-elevated' : '' } }"
    >
      <template #expand-cell="{ row }">
        <UButton
          v-if="row.getCanExpand()"
          :icon="row.getIsExpanded() ? 'heroicons:chevron-down' : 'heroicons:chevron-right'"
          size="sm"
          color="primary"
          variant="soft"
          data-test="cash-remuneration-transaction-expand-button"
          :aria-label="row.getIsExpanded() ? 'Collapse transaction events' : 'Expand transaction events'"
          @click="row.toggleExpanded()"
        />
      </template>

      <template #txHash-cell="{ row: { original: row } }">
        <AddressToolTip :address="row.txHash" :slice="true" type="transaction" />
      </template>

      <template #date-cell="{ row: { original: row } }">
        {{ formatDateShort(String(row.date)) }}
      </template>

      <template #type-cell="{ row }">
        <div class="flex items-center gap-2" :class="{ 'pl-4': row.depth > 0 }">
          <UBadge :color="getCashRemunerationTransactionTypeColor(row.original.type)" variant="soft">
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
        <UserComponent :user="resolveUser(row.from)" />
      </template>

      <template #to-cell="{ row: { original: row } }">
        <UserComponent :user="resolveUser(row.to)" />
      </template>

      <template #value-cell="{ row: { original: row } }">
        <div>{{ formatCryptoAmount(row.amount) }} {{ row.token }}</div>
        <div class="text-muted text-xs">{{ formatCurrencyShort(row.amountLocal, currencyStore.localCurrency.code) }}</div>
      </template>
    </UTable>
    <template #footer>
      <TransactionTableFooter
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        data-test-prefix="cash-remuneration-transaction"
      />
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useTransactionTable } from '@/composables/transactions/useTransactionTable'
import { type Address } from 'viem'
import { GRAPHQL_POLL_INTERVAL, NETWORK } from '@/constant'
import { useQuery } from '@vue/apollo-composable'
import AddressToolTip from '@/components/AddressToolTip.vue'
import UserComponent from '@/components/UserComponent.vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import TransactionTableFooter from '@/components/TransactionTableFooter.vue'
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
  log,
  resolveTokenIdByAddress,
  tokenSymbol
} from '@/utils'
import { formatDateShort } from '@/utils/dayUtils'
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

type CashRemunerationTransactionRow = CashRemunerationTransaction & {
  amount: string | number
  token: string
  tokenAddress: string
  amountLocal: number
}

const enrichedTransactions = computed<CashRemunerationTransactionRow[]>(() => {
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

const { dateRange, selectedType, typeOptions, page, pageSize, total, displayedTransactions, expandedRows, getSubRows } =
  useTransactionTable(enrichedTransactions)

const columns = computed(() => [
  { accessorKey: 'expand', header: '' },
  { accessorKey: 'txHash', header: 'Tx Hash' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'from', header: 'From' },
  { accessorKey: 'to', header: 'To' },
  { accessorKey: 'value', header: `Value (${currencyStore.localCurrency.code})` }
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

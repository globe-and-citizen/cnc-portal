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
      :meta="{ class: { tr: (row) => row.depth > 0 ? 'bg-elevated' : '' } }"
    >
      <template #expand-cell="{ row }">
        <UButton
          v-if="row.getCanExpand()"
          :icon="row.getIsExpanded() ? 'heroicons:chevron-down' : 'heroicons:chevron-right'"
          size="sm"
          color="primary"
          variant="soft"
          data-test="bank-transaction-expand-button"
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
          <UBadge :color="getBankTransactionTypeColor(row.original.type)" variant="soft">
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
        data-test-prefix="bank-transaction"
      />
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { type Address } from 'viem'
import { GRAPHQL_POLL_INTERVAL, NETWORK } from '@/constant'
import { useQuery } from '@vue/apollo-composable'
import AddressToolTip from '@/components/AddressToolTip.vue'
import UserComponent from '@/components/UserComponent.vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import TransactionTableFooter from '@/components/TransactionTableFooter.vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import { useTransactionTable } from '@/composables/transactions/useTransactionTable'
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
  resolveTokenIdByAddress,
  tokenSymbol
} from '@/utils'
import { formatDateShort } from '@/utils/dayUtils'
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

type BankTransactionRow = BankTransaction & {
  amount: string | number
  token: string
  tokenAddress: string
  amountLocal: number
}

const enrichedTransactions = computed<BankTransactionRow[]>(() => {
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

watch(error, (newError) => {
  if (newError) {
    log.error('Ponder bank transaction query error:', newError)
  }
})
</script>

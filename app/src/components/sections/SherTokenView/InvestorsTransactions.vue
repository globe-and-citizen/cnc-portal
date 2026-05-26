<template>
  <UCard class="w-full" data-test="investor-transactions">
    <template #header>
      <div class="flex items-center justify-between">
        <span>Transactions History</span>
        <div class="flex items-center gap-2">
          <CustomDatePicker
            v-model="dateRange"
            class="min-w-[140px]"
            data-test-prefix="investor-transaction-history"
          />
          <USelect
            v-model="selectedType"
            :items="typeOptions"
            class="min-w-[160px]"
            data-test="investor-transaction-history-type-filter"
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
      <template #expand-cell="{ row }">
        <UButton
          v-if="row.getCanExpand()"
          :icon="row.getIsExpanded() ? 'heroicons:chevron-down' : 'heroicons:chevron-right'"
          size="sm"
          color="primary"
          variant="soft"
          data-test="investor-transaction-expand-button"
          :aria-label="
            row.getIsExpanded() ? 'Collapse transaction events' : 'Expand transaction events'
          "
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
          <UBadge :color="getInvestorTransactionTypeColor(row.original.type)" variant="soft">
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
        <template v-if="row.token === '-'">
          <span class="text-muted">—</span>
        </template>
        <template v-else>
          <div>{{ formatCryptoAmount(row.amount) }} {{ row.token }}</div>
          <div class="text-muted text-xs">{{ formatCurrencyShort(row.amountUSD, 'USD') }}</div>
        </template>
      </template>
    </UTable>
    <template #footer>
      <TransactionTableFooter
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        data-test-prefix="investor-transaction"
      />
    </template>
  </UCard>
</template>

<script setup lang="ts">
import AddressToolTip from '@/components/AddressToolTip.vue'
import UserComponent from '@/components/UserComponent.vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import TransactionTableFooter from '@/components/TransactionTableFooter.vue'
import type { InvestorsTransaction } from '@/types/transactions'
import {
  buildRawInvestorTransactions,
  formatCryptoAmount,
  formatCurrencyShort,
  formatEtherUtil,
  formatInvestorTransactionDate,
  getInvestorTransactionTypeColor,
  parseBigIntOrZero,
  resolveUser,
  log,
  resolveTokenIdByAddress,
  tokenSymbol
} from '@/utils'
import { useQuery } from '@vue/apollo-composable'
import { computed, watch, ref } from 'vue'
import { useTransactionTable } from '@/composables/transactions/useTransactionTable'
import { GRAPHQL_POLL_INTERVAL, NETWORK } from '@/constant'
import { useCurrencyStore, useTeamStore } from '@/stores'
import type { TokenId } from '@/constant'
import { useInvestorSymbol } from '@/composables/investor/reads'
import { GET_INVESTOR_EVENTS } from '@/queries/ponder/investor.queries'
import { GET_SAFE_DEPOSIT_ROUTER_EVENTS } from '@/queries/ponder/safe-deposit-router.queries'
import type { InvestorEventsQuery, SafeDepositRouterEventsQuery } from '@/types/ponder/investor'
import { formatSafeDepositRouterMultiplier } from '@/utils/safeDepositRouterUtil'
import { formatDateShort } from '@/utils/dayUtils'

const teamStore = useTeamStore()
const currencyStore = useCurrencyStore()
const { data: investorSymbolData } = useInvestorSymbol()
const investorTokenSymbol = computed(() =>
  typeof investorSymbolData.value === 'string' ? investorSymbolData.value : 'SHER'
)

const investorAddress = computed(() => {
  const address = teamStore.getContractAddressByType('InvestorV1')
  return address ? address.toLowerCase() : ''
})

const safeDepositRouterAddress = computed(() => {
  const address = teamStore.getContractAddressByType('SafeDepositRouter')
  return address ? address.toLowerCase() : ''
})

const getUsdPrice = (tokenId: TokenId | null): number => {
  if (!tokenId) return 0
  const livePrice = currencyStore.getTokenPrice(tokenId, false, 'USD')
  if (livePrice > 0) return livePrice
  if (tokenId === 'usdc' || tokenId === 'usdc.e' || tokenId === 'usdt') return 1
  return 0
}

const { result, error, loading } = useQuery<InvestorEventsQuery>(
  GET_INVESTOR_EVENTS,
  {
    contractAddress: investorAddress,
    limit: 500
  },
  {
    pollInterval: GRAPHQL_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
    enabled: computed(() => Boolean(investorAddress.value))
  }
)

const { result: safeResult, error: safeError } = useQuery<SafeDepositRouterEventsQuery>(
  GET_SAFE_DEPOSIT_ROUTER_EVENTS,
  {
    contractAddress: safeDepositRouterAddress,
    limit: 500
  },
  {
    pollInterval: GRAPHQL_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
    enabled: computed(() => Boolean(safeDepositRouterAddress.value))
  }
)

const rawTransactions = computed(() => buildRawInvestorTransactions(result.value, safeResult.value))

const transactionData = computed<InvestorsTransaction[]>(() =>
  rawTransactions.value.map((tx) => {
    const isConfigEvent =
      tx.transactionType === 'safeDepositsEnabled' ||
      tx.transactionType === 'safeDepositsDisabled' ||
      tx.transactionType === 'safeAddressUpdated'

    const isMultiplierEvent = tx.transactionType === 'safeMultiplierUpdated'
    const tokenAddress = String(tx.tokenAddress ?? '').toLowerCase()
    const matchedToken = currencyStore.supportedTokens.find(
      (token) => token.address.toLowerCase() === tokenAddress
    )

    const token = isConfigEvent
      ? '-'
      : isMultiplierEvent
        ? 'x'
        : tx.transactionType === 'mint'
          ? investorTokenSymbol.value
          : matchedToken?.symbol ||
            tokenSymbol(tokenAddress) ||
            investorTokenSymbol.value ||
            NETWORK.currencySymbol

    const amount = isConfigEvent
      ? '0'
      : isMultiplierEvent
        ? formatSafeDepositRouterMultiplier(parseBigIntOrZero(tx.amount), 6)
        : formatEtherUtil(parseBigIntOrZero(tx.amount), tx.tokenAddress)
    const numericAmount = Number(amount)
    const tokenId =
      isConfigEvent || isMultiplierEvent
        ? null
        : (matchedToken?.id ?? resolveTokenIdByAddress(tokenAddress))
    const usdPrice = getUsdPrice(tokenId)
    const amountUSD = Number.isFinite(numericAmount) ? numericAmount * usdPrice : 0

    return {
      txHash: tx.txHash,
      date: formatInvestorTransactionDate(tx.timestamp),
      from: tx.from,
      to: tx.to,
      amount,
      amountUSD: amountUSD || 0,
      token,
      tokenAddress,
      type: tx.transactionType,
      reason: tx.reason
    }
  })
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
  getSubRows
} = useTransactionTable(transactionData)

const columns = computed(() => [
  { accessorKey: 'expand', header: '' },
  { accessorKey: 'txHash', header: 'Tx Hash' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'from', header: 'From' },
  { accessorKey: 'to', header: 'To' },
  { accessorKey: 'value', header: 'Value (USD)' }
])

const lastError = ref<string | null>(null)
watch(
  () => error.value?.message,
  (newMessage) => {
    if (newMessage && newMessage !== lastError.value) {
      log.error('Ponder investor transaction query error:', error.value)
      lastError.value = newMessage
    }
  }
)

const safeLastError = ref<string | null>(null)
watch(
  () => safeError.value?.message,
  (newMessage) => {
    if (newMessage && newMessage !== safeLastError.value) {
      log.error('Ponder safe deposit router transaction query error:', safeError.value)
      safeLastError.value = newMessage
    }
  }
)
</script>

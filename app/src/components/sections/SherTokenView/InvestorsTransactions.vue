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
      <template #date-cell="{ row }">
        <template v-if="row.depth === 0">
          <div class="font-medium">{{ formatDateRelative(String(row.original.date)) }}</div>
          <div class="text-muted text-xs">{{ formatDateUTC(String(row.original.date)) }}</div>
        </template>
        <span v-else />
      </template>

      <template #txHash-cell="{ row }">
        <AddressToolTip
          v-if="row.depth === 0"
          :address="row.original.txHash"
          :slice="true"
          type="transaction"
        />
        <span v-else />
      </template>

      <template #type-cell="{ row }">
        <template v-if="row.depth === 0">
          <div>
            <div class="flex items-center gap-2">
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
              <UBadge color="primary" variant="soft">
                {{ getTransactionTypeLabel(row.original.type) }}
              </UBadge>
              <span v-if="row.original.groupedEventCount > 1" class="text-muted text-xs">
                {{ row.original.groupedEventCount }} events
              </span>
            </div>
            <p v-if="getUniqueSummary(row.original)" class="text-muted mt-0.5 text-xs">
              {{ getUniqueSummary(row.original) }}
            </p>
            <template v-if="getInlineUser(row.original)">
              <div class="mt-1 flex items-center gap-1 text-xs">
                <span v-if="getInlineUser(row.original)!.label" class="text-muted">
                  {{ getInlineUser(row.original)!.label }}
                </span>
                <UserComponent :user="resolveUser(getInlineUser(row.original)!.address)" />
              </div>
            </template>
          </div>
        </template>
        <TransactionChildRow
          v-else
          :type="row.original.type"
          :other-address="row.original.to"
          :amount="row.original.amount"
          :token="row.original.token"
          :reason="row.original.reason"
          :parent-amount="row.getParentRow()?.original.amount"
        />
      </template>

      <template #details-cell="{ row }">
        <UButton
          v-if="row.depth === 0"
          icon="heroicons:eye"
          size="xs"
          color="neutral"
          variant="ghost"
          data-test="investor-transaction-detail-button"
          aria-label="View transaction details"
          @click="openDetail(row.original)"
        />
        <span v-else />
      </template>

      <template #value-cell="{ row }">
        <template v-if="row.depth === 0">
          <template v-if="row.original.token === '-'">
            <span class="text-muted">—</span>
          </template>
          <template v-else>
            <div :class="getValueClass(row.original)">
              {{ getValuePrefix(row.original) }}{{ formatCryptoAmount(row.original.amount) }}
              {{ row.original.token }}
            </div>
            <div class="text-muted text-xs">
              {{ formatCurrencyShort(row.original.amountUSD, 'USD') }}
            </div>
          </template>
        </template>
        <span v-else />
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

  <TransactionDetailModal v-if="selectedTx" v-model:open="showDetail" :transaction="selectedTx" />
</template>

<script setup lang="ts">
import AddressToolTip from '@/components/AddressToolTip.vue'
import UserComponent from '@/components/UserComponent.vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import TransactionTableFooter from '@/components/TransactionTableFooter.vue'
import TransactionDetailModal from '@/components/TransactionDetailModal.vue'
import type { TokenId } from '@/constant'
import {
  buildRawInvestorTransactions,
  mapRawInvestorTransaction,
  formatCryptoAmount,
  formatCurrencyShort,
  resolveUser,
  getTransactionSummary,
  getTransactionTypeLabel,
  log
} from '@/utils'
import { useQuery } from '@vue/apollo-composable'
import { computed, watch } from 'vue'
import {
  useTransactionTable,
  childHidden,
  childColspanFrom
} from '@/composables/transactions/useTransactionTable'
import { useTransactionInline } from '@/composables/transactions/useTransactionInline'
import TransactionChildRow from '@/components/TransactionChildRow.vue'
import { GRAPHQL_POLL_INTERVAL } from '@/constant'
import { useCurrencyStore, useTeamStore } from '@/stores'
import { useInvestorSymbol } from '@/composables/investor/reads'
import { GET_INVESTOR_EVENTS } from '@/queries/ponder/investor.queries'
import { GET_SAFE_DEPOSIT_ROUTER_EVENTS } from '@/queries/ponder/safe-deposit-router.queries'
import type { InvestorEventsQuery, SafeDepositRouterEventsQuery } from '@/types/ponder/investor'
import { formatDateRelative, formatDateUTC } from '@/utils/dayUtils'

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

const {
  result,
  error,
  loading: investorLoading
} = useQuery<InvestorEventsQuery>(
  GET_INVESTOR_EVENTS,
  { contractAddress: investorAddress, limit: 500 },
  {
    pollInterval: GRAPHQL_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
    enabled: computed(() => Boolean(investorAddress.value))
  }
)

const {
  result: safeResult,
  error: safeError,
  loading: safeLoading
} = useQuery<SafeDepositRouterEventsQuery>(
  GET_SAFE_DEPOSIT_ROUTER_EVENTS,
  { contractAddress: safeDepositRouterAddress, limit: 500 },
  {
    pollInterval: GRAPHQL_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
    enabled: computed(() => Boolean(safeDepositRouterAddress.value))
  }
)

const loading = computed(() => investorLoading.value || safeLoading.value)

const enrichedTransactions = computed(() =>
  buildRawInvestorTransactions(result.value, safeResult.value).map((tx) =>
    mapRawInvestorTransaction(tx, investorTokenSymbol.value, getUsdPrice)
  )
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

const getUniqueSummary = (row: { type: string; amount: string | number; token: string }) => {
  const summary = getTransactionSummary(row)
  return summary && summary !== getTransactionTypeLabel(row.type) ? summary : null
}

const { getInlineUser, getValuePrefix, getValueClass } = useTransactionInline(
  computed(() => [investorAddress.value, safeDepositRouterAddress.value].filter(Boolean))
)

const columns = computed(() => [
  { accessorKey: 'date', header: 'Date', meta: { class: { td: childHidden } } },
  { accessorKey: 'type', header: 'Type', meta: { colspan: { td: childColspanFrom(0) } } },
  { accessorKey: 'value', header: 'Value (USD)', meta: { class: { td: childHidden } } },
  { accessorKey: 'txHash', header: 'Tx Hash', meta: { class: { td: childHidden } } },
  { accessorKey: 'details', header: 'Action', meta: { class: { td: childHidden } } }
])

watch([error, safeError], ([newError, newSafeError]) => {
  if (newError) log.error('Ponder investor transaction query error:', newError)
  if (newSafeError) log.error('Ponder safe deposit router transaction query error:', newSafeError)
})
</script>

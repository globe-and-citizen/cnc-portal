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
      :meta="{ class: { tr: (row: { depth: number }) => (row.depth > 0 ? 'bg-elevated' : '') } }"
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
            data-test="investor-transaction-detail-button"
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
          data-test="investor-transaction-expand-button"
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
              <UBadge color="primary" variant="soft">
                {{ getTransactionTypeLabel(row.original.type) }}
              </UBadge>
              <span v-if="row.original.groupedEventCount > 1" class="text-muted text-xs">
                {{ row.original.groupedEventCount }} events
              </span>
            </div>
            <p class="text-muted mt-0.5 text-xs">
              <template v-if="row.original.type === 'mint' && row.original.groupedEventCount > 1">
                Minted {{ formatCryptoAmount(getMintTotal(row.original)) }} {{ row.original.token }}
              </template>
              <template v-else-if="getUniqueSummary(row.original)">{{
                getUniqueSummary(row.original)
              }}</template>
            </p>
            <template
              v-if="
                (getInlineUser(row.original) || row.original.type === 'safeAddressUpdated') &&
                !(row.original.type === 'mint' && row.original.groupedEventCount > 1)
              "
            >
              <div class="mt-1 flex items-center gap-1 text-xs">
                <UserComponent :user="resolveUser(row.original.from)" />
                <span class="text-muted text-lg font-bold">→</span>
                <UserComponent :user="resolveUser(row.original.to)" />
              </div>
            </template>
          </div>
        </template>
        <div v-else class="flex items-center gap-2 py-0.5 pl-4">
          <UBadge color="primary" variant="soft">{{
            getTransactionTypeLabel(row.original.type)
          }}</UBadge>
          <span v-if="row.original.reason" class="text-muted text-xs"
            >({{ row.original.reason }})</span
          >
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
        <template v-else>
          <UserComponent v-if="row.original.to" :user="resolveUser(row.original.to)" />
          <span v-else class="text-muted">—</span>
        </template>
      </template>

      <template #value-cell="{ row }">
        <template v-if="row.depth === 0">
          <template v-if="row.original.token === '-'">
            <span class="text-muted">—</span>
          </template>
          <template v-else>
            <div
              :class="
                row.original.type === 'mint'
                  ? 'text-success font-medium'
                  : getValueClass(row.original)
              "
            >
              {{ row.original.type === 'mint' ? '+' : getValuePrefix(row.original)
              }}{{ formatCryptoAmount(String(getMintTotal(row.original))) }}
              {{ row.original.token }}
            </div>
            <div v-if="row.original.token !== investorTokenSymbol" class="text-muted text-xs">
              {{ formatCurrencyShort(row.original.amountUSD, 'USD') }}
            </div>
          </template>
        </template>
        <template v-else>
          <div class="text-sm font-medium">
            {{ formatCryptoAmount(String(row.original.amount)) }} {{ row.original.token }}
          </div>
          <div
            v-if="
              DIVIDEND_TYPES.has(row.getParentRow()?.original.type ?? '') &&
              Number(row.getParentRow()?.original.amount) > 0
            "
            class="text-muted text-xs"
          >
            {{
              (
                (Number(row.original.amount) / Number(row.getParentRow()!.original.amount)) *
                100
              ).toFixed(2)
            }}%
          </div>
        </template>
      </template>
    </UTable>
    <template #footer>
      <TablePagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        noun="transactions"
        data-test-prefix="investor-transaction"
      />
    </template>
  </UCard>

  <TransactionDetailModal v-if="selectedTx" v-model:open="showDetail" :transaction="selectedTx" />
</template>

<script setup lang="ts">
import UserComponent from '@/components/UserComponent.vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import TablePagination from '@/components/TablePagination.vue'
import TransactionDetailModal from '@/components/TransactionDetailModal.vue'
import type { TokenId } from '@/constant'
import {
  buildRawInvestorTransactions,
  mapRawInvestorTransaction,
  formatCryptoAmount,
  formatCurrencyShort,
  resolveUser,
  getTransactionTypeLabel,
  getTransactionCounterparty,
  getUniqueSummary,
  getMintTotal,
  formatTxHash,
  DIVIDEND_TYPES,
  log
} from '@/utils'
import { computed, watch } from 'vue'
import { useTransactionTable } from '@/composables/transactions/useTransactionTable'
import { useTransactionInline } from '@/composables/transactions/useTransactionInline'
import { useCurrencyStore, useTeamStore } from '@/stores'
import { useInvestorSymbol } from '@/composables/investor/reads'
import { useInvestorEventsViaLogs } from '@/composables/investor/useInvestorEventsViaLogs'
import { useSafeDepositRouterEventsViaLogs } from '@/composables/investor/useSafeDepositRouterEventsViaLogs'
import { formatDateRelative, formatDateUTC } from '@/utils/dayUtils'

const teamStore = useTeamStore()
const currencyStore = useCurrencyStore()
const { data: investorSymbolData } = useInvestorSymbol()
const investorTokenSymbol = computed(() =>
  typeof investorSymbolData.value === 'string' ? investorSymbolData.value : 'SHER'
)

const investorAddress = computed(() => {
  const address = teamStore.getInvestorAddress()
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

// EXPERIMENT: source Investor + SafeDepositRouter events from the RPC (eth_getLogs)
// instead of Ponder.
const { result, error, loading: investorLoading } = useInvestorEventsViaLogs(investorAddress)

const {
  result: safeResult,
  error: safeError,
  loading: safeLoading
} = useSafeDepositRouterEventsViaLogs(safeDepositRouterAddress)

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
  getSubRows: defaultGetSubRows,
  selectedTx,
  showDetail,
  openDetail
} = useTransactionTable(enrichedTransactions, { key: 'investorTx' })

type InvestorRow = (typeof enrichedTransactions.value)[number] & { subRows?: unknown[] }

const getSubRows = (row: InvestorRow) => {
  const base = defaultGetSubRows(row as Parameters<typeof defaultGetSubRows>[0])
  if ((row as { type: string }).type === 'mint' && base.length) {
    const { subRows: _sub, ...parentData } = row as Record<string, unknown>
    void _sub
    return [{ ...parentData, subRows: [], groupedEventCount: 1 }, ...base] as typeof base
  }
  return base
}

const { getInlineUser, getValuePrefix, getValueClass } = useTransactionInline(
  computed(() => [investorAddress.value, safeDepositRouterAddress.value].filter(Boolean))
)

const columns = computed(() => [
  { accessorKey: 'expand', header: '' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'counterparty', header: 'Counterparty' },
  { accessorKey: 'value', header: 'Value (USD)' },
  { accessorKey: 'tx', header: 'Tx Hash' }
])

watch([error, safeError], ([newError, newSafeError]) => {
  if (newError) log.error('Ponder investor transaction query error:', newError)
  if (newSafeError) log.error('Ponder safe deposit router transaction query error:', newSafeError)
})
</script>

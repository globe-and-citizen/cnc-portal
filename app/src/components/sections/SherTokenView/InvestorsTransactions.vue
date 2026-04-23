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

    <UTable :data="displayedTransactions" :columns="columns" :loading="loading">
      <template #txHash-cell="{ row: { original: row } }">
        <AddressToolTip :address="row.txHash" :slice="true" type="transaction" />
      </template>

      <template #date-cell="{ row: { original: row } }">
        {{ formatDateShort(String(row.date)) }}
      </template>

      <template #type-cell="{ row: { original: row } }">
        <span class="badge" :class="getTypeClass(row.type)">{{ row.type }}</span>
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

      <template #valueUSD-cell="{ row: { original: row } }">
        {{ formatCurrencyShort(row.amountUSD, 'USD') }}
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import AddressToolTip from '@/components/AddressToolTip.vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import { useTeamStore } from '@/stores'
import type { InvestorsTransaction } from '@/types/transactions'
import {
  formatCryptoAmount,
  formatCurrencyShort,
  formatEtherUtil,
  getTokenAddress,
  log,
  tokenSymbol
} from '@/utils'
import { useQuery } from '@vue/apollo-composable'
import { computed, watch, ref } from 'vue'
import { GRAPHQL_POLL_INTERVAL, NETWORK } from '@/constant'
import { useCurrencyStore } from '@/stores'
import type { TokenId } from '@/constant'
import { zeroAddress } from 'viem'
import { useInvestorSymbol } from '@/composables/investor/reads'
import { GET_INVESTOR_EVENTS } from '@/queries/ponder/investor.queries'
import { GET_SAFE_DEPOSIT_ROUTER_EVENTS } from '@/queries/ponder/safe-deposit-router.queries'
import type {
  InvestorEventsQuery,
  RawInvestorTransaction,
  SafeDepositRouterEventsQuery
} from '@/types/ponder/investor'
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

const txHashFromId = (id: string): string => {
  const [txHash] = id.split('-')
  return txHash ?? id
}

const parseAmount = (value: string): bigint => {
  try {
    return BigInt(value)
  } catch {
    return 0n
  }
}

const KNOWN_TOKEN_IDS: TokenId[] = ['native', 'usdc', 'usdc.e', 'usdt', 'sher']

const resolveTokenIdByAddress = (tokenAddress: string): TokenId | null => {
  const normalizedAddress = tokenAddress.toLowerCase()
  const knownId = KNOWN_TOKEN_IDS.find((tokenId) => {
    const knownAddress = (getTokenAddress(tokenId) ?? zeroAddress).toLowerCase()
    return knownAddress === normalizedAddress
  })

  return knownId ?? null
}

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

const rawTransactions = computed<RawInvestorTransaction[]>(() => {
  const mints = result.value?.investorMints?.items ?? []
  const distributed = result.value?.investorDividendDistributeds?.items ?? []
  const paids = result.value?.investorDividendPaids?.items ?? []
  const faileds = result.value?.investorDividendPaymentFaileds?.items ?? []
  const safeDeposits = safeResult.value?.safeDeposits?.items ?? []
  const safeDepositsEnableds = safeResult.value?.safeDepositsEnableds?.items ?? []
  const safeDepositsDisableds = safeResult.value?.safeDepositsDisableds?.items ?? []
  const safeAddressUpdateds = safeResult.value?.safeAddressUpdateds?.items ?? []
  const safeMultiplierUpdateds = safeResult.value?.safeMultiplierUpdateds?.items ?? []

  const merged: RawInvestorTransaction[] = [
    ...mints.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.shareholder,
      amount: row.amount,
      tokenAddress: row.contractAddress,
      transactionType: 'mint' as const
    })),
    ...distributed.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.distributor,
      to: row.contractAddress,
      amount: row.totalAmount,
      tokenAddress: row.token,
      transactionType: 'dividendDistributed' as const
    })),
    ...paids.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.shareholder,
      amount: row.amount,
      tokenAddress: row.token,
      transactionType: 'dividendPaid' as const
    })),
    ...faileds.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.shareholder,
      amount: row.amount,
      tokenAddress: row.token,
      transactionType: 'dividendPaymentFailed' as const,
      reason: row.reason
    })),
    ...safeDeposits.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.depositor,
      to: row.contractAddress,
      amount: row.tokenAmount,
      tokenAddress: row.token,
      transactionType: 'safeDeposit' as const
    })),
    ...safeDepositsEnableds.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.enabledBy,
      to: row.contractAddress,
      amount: '0',
      tokenAddress: zeroAddress,
      transactionType: 'safeDepositsEnabled' as const
    })),
    ...safeDepositsDisableds.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.disabledBy,
      to: row.contractAddress,
      amount: '0',
      tokenAddress: zeroAddress,
      transactionType: 'safeDepositsDisabled' as const
    })),
    ...safeAddressUpdateds.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.oldSafe,
      to: row.newSafe,
      amount: '0',
      tokenAddress: zeroAddress,
      transactionType: 'safeAddressUpdated' as const
    })),
    ...safeMultiplierUpdateds.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.contractAddress,
      amount: row.newMultiplier,
      tokenAddress: zeroAddress,
      transactionType: 'safeMultiplierUpdated' as const
    }))
  ]

  return merged.sort((a, b) => b.timestamp - a.timestamp)
})

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
        ? formatSafeDepositRouterMultiplier(parseAmount(tx.amount), 6)
        : formatEtherUtil(parseAmount(tx.amount), tx.tokenAddress)
    const numericAmount = Number(amount)
    const tokenId =
      isConfigEvent || isMultiplierEvent
        ? null
        : (matchedToken?.id ?? resolveTokenIdByAddress(tokenAddress))
    const usdPrice = getUsdPrice(tokenId)
    const amountUSD = Number.isFinite(numericAmount) ? numericAmount * usdPrice : 0

    return {
      txHash: tx.txHash,
      date: new Date(tx.timestamp * 1000).toLocaleString('en-US'),
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

const dateRange = ref<[Date, Date] | null>(null)
const selectedType = ref('all')

const uniqueTypes = computed(() => {
  const types = new Set(transactionData.value.map((tx) => tx.type))
  return Array.from(types).sort()
})

const typeOptions = computed(() => [
  { label: 'All Types', value: 'all' },
  ...uniqueTypes.value.map((type) => ({ label: type, value: type }))
])

const displayedTransactions = computed(() => {
  let filtered = transactionData.value

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

const columns = computed(() => [
  { accessorKey: 'txHash', header: 'Tx Hash' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'from', header: 'From' },
  { accessorKey: 'to', header: 'To' },
  { accessorKey: 'amount', header: 'Amount' },
  { accessorKey: 'valueUSD', header: 'Value (USD)' }
])

const getTypeClass = (type: string) => ({
  'badge-success': type.toLowerCase().includes('mint') || type.toLowerCase().includes('paid'),
  'badge-warning': type.toLowerCase().includes('distributed'),
  'badge-error': type.toLowerCase().includes('failed'),
  'badge-info': type.toLowerCase().includes('transfer')
})

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

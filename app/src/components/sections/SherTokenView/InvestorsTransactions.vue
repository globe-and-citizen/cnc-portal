<template>
  <UCard class="w-full">
    <template #header>
      <div class="flex items-center justify-between">
        <span>Transactions History</span>
        <InvestorsTransactionFilters
          :unique-types="uniqueTypes"
          :show-date-filter="true"
          data-test-prefix="investor-transaction-history"
          v-model:date-range="dateRange"
          v-model:selected-type="selectedType"
        />
      </div>
    </template>
    <InvestorsTransactionTable :transactions="displayedTransactions" />
  </UCard>
</template>

<script setup lang="ts">
import { useTeamStore } from '@/stores'
import type { InvestorsTransaction } from '@/types/transactions'
import { formatEtherUtil, getTokenAddress, log, tokenSymbol } from '@/utils'
import { useQuery } from '@vue/apollo-composable'
import { computed, watch, ref } from 'vue'
import { GRAPHQL_POLL_INTERVAL, NETWORK } from '@/constant'
import { useCurrencyStore } from '@/stores'
import type { TokenId } from '@/constant'
import { zeroAddress } from 'viem'
import { useInvestorSymbol } from '@/composables/investor/reads'
import { GET_INVESTOR_EVENTS } from '@/queries/ponder/investor.queries'
import type { InvestorEventsQuery, RawInvestorTransaction } from '@/types/ponder/investor'
import InvestorsTransactionFilters from '@/components/sections/SherTokenView/InvestorsTransactionFilter.vue'
import InvestorsTransactionTable from '@/components/sections/SherTokenView/InvestorsTransactionTable.vue'

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

const { result, error } = useQuery<InvestorEventsQuery>(
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

const rawTransactions = computed<RawInvestorTransaction[]>(() => {
  const mints = result.value?.investorMints?.items ?? []
  const distributed = result.value?.investorDividendDistributeds?.items ?? []
  const paids = result.value?.investorDividendPaids?.items ?? []
  const faileds = result.value?.investorDividendPaymentFaileds?.items ?? []

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
    }))
  ]

  return merged.sort((a, b) => b.timestamp - a.timestamp)
})

const transactionData = computed<InvestorsTransaction[]>(() =>
  rawTransactions.value.map((tx) => {
    const tokenAddress = String(tx.tokenAddress ?? '').toLowerCase()
    const matchedToken = currencyStore.supportedTokens.find(
      (token) => token.address.toLowerCase() === tokenAddress
    )
    const token =
      tx.transactionType === 'mint'
        ? investorTokenSymbol.value
        : matchedToken?.symbol || tokenSymbol(tokenAddress) || investorTokenSymbol.value || NETWORK.currencySymbol

    const amount = formatEtherUtil(parseAmount(tx.amount), tx.tokenAddress)
    const numericAmount = Number(amount)
    const tokenId = matchedToken?.id ?? resolveTokenIdByAddress(tokenAddress)
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
</script>

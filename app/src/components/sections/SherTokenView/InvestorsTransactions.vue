<template>
  <InvestorsTransactionHistory :transactions="transactionData" title="Transactions History" />
</template>

<script setup lang="ts">
import { useTeamStore } from '@/stores'
import type { InvestorsTransaction, RawInvestorsTransaction } from '@/types/transactions'
import { formatEtherUtil, log, tokenSymbol } from '@/utils'
import { useQuery } from '@vue/apollo-composable'

import gql from 'graphql-tag'
import { computed, watch, ref } from 'vue'

import { GRAPHQL_POLL_INTERVAL } from '@/constant'
import InvestorsTransactionHistory from '@/components/sections/SherTokenView/InvestorsTransactionHistory.vue'
import { useCurrencyStore } from '@/stores'
import type { TokenId } from '@/constant'

const teamStore = useTeamStore()

const bankAddress = teamStore.getContractAddressByType('Bank')

const currencyStore = useCurrencyStore()

const selectedTokenId = ref<TokenId>('native')

const { result, error } = useQuery(
  gql`
    query GetDividendClaims($bankAddress: Bytes!) {
      dividendClaims: transactions(
        where: {
          contractAddress: $bankAddress
          transactionType_in: ["dividendClaim", "tokenDividendClaim"]
        }
        orderBy: blockTimestamp
        orderDirection: desc
      ) {
        id
        from
        to
        amount
        contractType
        tokenAddress
        transactionHash
        blockNumber
        blockTimestamp
        transactionType
      }
    }
  `,
  {
    bankAddress: bankAddress
  },
  {
    pollInterval: GRAPHQL_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
    enabled: computed(() => Boolean(bankAddress))
  }
)

watch(
  () => result.value,
  (newResult) => {
    console.log('GraphQL result:', newResult)
  }
)

const tokenPrices = computed(() => ({
  USDC: 1,
  default: currencyStore.getTokenPrice(selectedTokenId.value, false, 'USD')
}))

const formatTransactions: (tx: RawInvestorsTransaction) => InvestorsTransaction = (tx) => {
  const amount = formatEtherUtil(BigInt(tx.amount), tx.tokenAddress)
  const token = tokenSymbol(tx.tokenAddress)

  const numericAmount = Number(amount)
  const usdAmount =
    token === 'USDC'
      ? numericAmount * tokenPrices.value.USDC
      : numericAmount * tokenPrices.value.default

  return {
    txHash: tx.transactionHash,
    date: new Date(Number(tx.blockTimestamp) * 1000).toLocaleString('en-US'),
    from: tx.from,
    to: tx.to,
    amount: amount,
    amountUSD: usdAmount || 0,
    token,
    type: tx.transactionType
  }
}

const transactionData = computed<InvestorsTransaction[]>(() => {
  const claims = result.value?.dividendClaims || []
  return claims.map(formatTransactions)
})
const lastError = ref<string | null>(null)
watch(
  () => error.value?.message,
  (newMessage) => {
    if (newMessage && newMessage !== lastError.value) {
      log.error('GraphQL Error:', error.value)
      lastError.value = newMessage
    }
  }
)
</script>

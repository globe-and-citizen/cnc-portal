<template>
  <InvestorsTransactionHistory :transactions="transactionData" title="Transactions History" />
</template>

<script setup lang="ts">
import { useTeamStore, useToastStore } from '@/stores'
import type { InvestorsTransaction, RawInvestorsTransaction } from '@/types/transactions'
import { formatEtherUtil, log, tokenSymbol } from '@/utils'
import { useQuery } from '@vue/apollo-composable'

import gql from 'graphql-tag'
import { computed, watch, ref } from 'vue'

import { GRAPHQL_POLL_INTERVAL } from '@/constant'
import InvestorsTransactionHistory from '@/components/sections/SherTokenView/InvestorsTransactionHistory.vue'
import { useCurrencyStore } from '@/stores'
import type { TokenId } from '@/constant'

const investorAddress = computed(() => teamStore.getContractAddressByType('InvestorsV1'))

const currencyStore = useCurrencyStore()
const teamStore = useTeamStore()
const { addErrorToast } = useToastStore()

const selectedTokenId = ref<TokenId>('native')

const { result, error } = useQuery(
  gql`
    query GetDividendTransactions($investorAddress: Bytes!) {
      # Get individual dividend distributions
      dividendDistributions: transactions(
        where: { contractAddress: $investorAddress, transactionType: "dividend" }
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
    investorAddress: investorAddress.value
  },
  {
    pollInterval: GRAPHQL_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
    enabled: computed(() => Boolean(investorAddress.value))
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
  const distributions = result.value?.dividendDistributions || []
  return distributions.map(formatTransactions)
})
watch(error, (newError) => {
  if (newError) {
    addErrorToast('Failed to fetch payment transactions')
    log.error('useQueryError: ', newError)
  }
})
</script>

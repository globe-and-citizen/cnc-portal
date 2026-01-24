<template>
  <GenericTransactionHistory
    :transactions="transactionData"
    data-test="cash-remuneration-transactions"
    title="Cash Remuneration Transactions History"
    :currencies="currencies"
    :show-receipt-modal="true"
  >
  </GenericTransactionHistory>
</template>
<script setup lang="ts">
import GenericTransactionHistory from '@/components/GenericTransactionHistory.vue'
import { useCurrencyStore, useTeamStore } from '@/stores'
import type { CashRemunerationTransaction } from '@/types/transactions'
import { formatEtherUtil, log, tokenSymbol } from '@/utils'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import { computed, watch } from 'vue'
import { zeroAddress, type Address } from 'viem'
import { GRAPHQL_POLL_INTERVAL } from '@/constant'

const currencyStore = useCurrencyStore()
const teamStore = useTeamStore()
const currencies = computed(() => {
  const defaultCurrency = currencyStore.localCurrency?.code
  return defaultCurrency === 'USD' ? ['USD'] : ['USD', defaultCurrency]
})
const contractAddress = teamStore.getContractAddressByType('CashRemunerationEIP712') as Address

const { result, error } = useQuery(
  gql`
    query GetCashRemunerationTransactions($contractAddress: Bytes!) {
      transactions(
        where: { contractAddress: $contractAddress }
        orderBy: blockTimestamp
        orderDirection: desc
      ) {
        id
        from
        to
        amount
        contractType
        tokenAddress
        contractAddress
        transactionHash
        blockNumber
        blockTimestamp
        transactionType
      }
    }
  `,
  { contractAddress },
  {
    pollInterval: GRAPHQL_POLL_INTERVAL, // Poll using GRAPHQL_POLL_INTERVAL (e.g., 12000 ms)
    fetchPolicy: 'cache-and-network'
  }
)

const transactionData = computed<CashRemunerationTransaction[]>(() => {
  return result.value?.transactions
    ? result.value.transactions.map((transaction: Record<string, string>) => ({
        txHash: transaction.transactionHash,
        date: new Date(Number(transaction.blockTimestamp) * 1000).toLocaleString('en-US'),
        from: transaction.from,
        to: transaction.to,
        amount: formatEtherUtil(
          BigInt(transaction.amount ?? '0'),
          transaction.tokenAddress ?? zeroAddress
        ),
        token: tokenSymbol(transaction.tokenAddress ?? zeroAddress),
        type: transaction.transactionType
      }))
    : []
})

watch(error, (newError) => {
  if (newError) {
    log.error('useQueryError: ', newError)
  }
})
</script>

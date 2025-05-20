<!-- TransactionsHistorySection.vue -->
<template>
  <GenericTransactionHistory
    :transactions="transactions"
    title="Bank Transactions History"
    :currencies="currencies"
    :show-receipt-modal="true"
    data-test="bank-transactions"
  />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import GenericTransactionHistory from '@/components/GenericTransactionHistory.vue'
import type { BankTransaction } from '@/types/transactions'
import { useTeamStore } from '@/stores'
import { useCurrencyStore } from '@/stores/currencyStore'
import type { Address } from 'viem'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import { formatEtherUtil, log, tokenSymbol } from '@/utils'
import { GRAPHQL_POLL_INTERVAL } from '@/constant'

const teamStore = useTeamStore()
const currencyStore = useCurrencyStore()

// Computed property for currencies based on user preference
const currencies = computed(() => {
  const defaultCurrency = currencyStore.currency.code
  return defaultCurrency === 'USD' ? ['USD'] : ['USD', defaultCurrency]
})

const contractAddress = computed(
  () =>
    teamStore.currentTeam?.teamContracts.find((contract) => contract.type === 'Bank')
      ?.address as Address
)

const { result, error } = useQuery(
  gql`
    query GetBankTransactions($contractAddress: Bytes!) {
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
    pollInterval: GRAPHQL_POLL_INTERVAL, // Use constant
    fetchPolicy: 'cache-and-network'
  }
)

const transactions = computed<BankTransaction[]>(() =>
  result.value?.transactions
    ? result.value.transactions.map((transaction: Record<string, string>) => ({
        txHash: transaction.transactionHash,
        date: new Date(Number(transaction.blockTimestamp) * 1000).toLocaleString('en-US'),
        from: transaction.from,
        to: transaction.to,
        amount: formatEtherUtil(BigInt(transaction.amount), transaction.tokenAddress),
        token: tokenSymbol(transaction.tokenAddress),
        type: transaction.transactionType
      }))
    : []
)

watch(error, (newError) => {
  if (newError) {
    log.error('useQueryError: ', newError)
  }
})
</script>

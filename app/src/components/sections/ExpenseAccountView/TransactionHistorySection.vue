<template>
  <GenericTransactionHistory
    :transactions="transactionData"
    title="Expense Account Transfer History"
    :currencies="currencies"
    :show-receipt-modal="true"
    data-test="expense-transactions"
    @receipt-click="handleReceiptClick"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GenericTransactionHistory from '@/components/GenericTransactionHistory.vue'
import type { ExpenseTransaction, BaseTransaction } from '@/types/transactions'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import { formatEtherUtil, log, tokenSymbol } from '@/utils'
import { useTeamStore } from '@/stores'
import { useCurrencyStore } from '@/stores/currencyStore'
import type { ReceiptData } from '@/utils/excelExport'
import { zeroAddress, type Address } from 'viem'
import { GRAPHQL_POLL_INTERVAL } from '@/constant'

const teamStore = useTeamStore()
const currencyStore = useCurrencyStore()

const contractAddress = computed(
  () =>
    teamStore.currentTeam?.teamContracts.find(
      (contract) => contract.type === 'ExpenseAccountEIP712'
    )?.address as Address
)

const { result, error } = useQuery(
  gql`
    query GetTransactions($contractAddress: Bytes!) {
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
    pollInterval: GRAPHQL_POLL_INTERVAL, // Poll interval for GraphQL queries, set to 12000 ms
    fetchPolicy: 'cache-and-network'
  }
)

const transactionData = computed<ExpenseTransaction[]>(() =>
  result.value?.transactions
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
)

const selectedTransaction = ref<BaseTransaction | null>(null)

// Computed property for currencies based on user preference
const currencies = computed(() => {
  const defaultCurrency = currencyStore.localCurrency.code
  return defaultCurrency === 'USD' ? ['USD'] : ['USD', defaultCurrency]
})

const handleReceiptClick = (data: ReceiptData) => {
  // If you need to do any processing with the receipt data
  selectedTransaction.value = {
    ...data,
    amountUSD: data.amountUSD,
    [data.token]: data.amount,
    // Add any other required BaseTransaction properties
    status: 'completed'
  } as BaseTransaction
}

watch(error, (newError) => {
  if (newError) {
    log.error('useQueryError: ', newError)
  }
})
</script>

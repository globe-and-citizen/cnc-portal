<!-- TransactionsHistorySection.vue -->
<template>
  <GenericTransactionHistory
    :transactions="transactions"
    title="Bank Transactions History"
    :currencies="['USD']"
    :currency-rates="{
      loading: false,
      error: null,
      getRate: () => 1
    }"
    :show-receipt-modal="true"
    data-test="bank-transactions"
    @receipt-click="handleReceiptClick"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GenericTransactionHistory from '@/components/GenericTransactionHistory.vue'
import type { BankTransaction, BaseTransaction } from '@/types/transactions'
import { useTeamStore } from '@/stores'
import type { Address } from 'viem'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import { formatEtherUtil, log, tokenSymbol } from '@/utils'
import type { ReceiptData } from '@/utils/excelExport'

const teamStore = useTeamStore()

const contractAddress = computed(
  () =>
    teamStore.currentTeam?.teamContracts.find(
      (contract) => contract.type === 'Bank'
    )?.address as Address
)

const { result, error } = useQuery(
  gql`
    query GetBankTransactions($contractAddress: Bytes!) {
      transactions(where: { contractAddress: $contractAddress }) {
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
  { contractAddress }
)

const transactions = computed<BankTransaction[]>(() =>
  result.value?.transactions
    ? result.value.transactions.map((transaction: Record<string, string>) => ({
        txHash: transaction.transactionHash,
        date: new Date(Number(transaction.blockTimestamp) * 1000).toLocaleString('en-US'),
        from: transaction.from,
        to: transaction.to,
        amountUSD: 10,
        amount: formatEtherUtil(BigInt(transaction.amount), transaction.tokenAddress),
        token: tokenSymbol(transaction.tokenAddress),
        type: transaction.transactionType
      }))
    : []
)

const selectedTransaction = ref<BaseTransaction | null>(null)

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

<template>
  <GenericTransactionHistory
    v-if="transactionData.length > 0"
    :transactions="transactionData"
    title="Expense Account Transfer History"
    :currencies="['USD', 'CAD', 'INR', 'EUR']"
    :currency-rates="currencyRates"
    :show-receipt-modal="true"
    data-test="expense-transactions"
    @receipt-click="handleReceiptClick"
  />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import GenericTransactionHistory from '@/components/GenericTransactionHistory.vue'
import type { ExpenseTransaction, BaseTransaction } from '@/types/transactions'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import { formatEtherUtil, log, tokenSymbol } from '@/utils'

interface Props {
  currencyRates: {
    loading: boolean
    error: string | null
    getRate: (currency: string) => number
  }
}

defineProps<Props>()

// const transactions = ref<ExpenseTransaction[]>([
//   {
//     txHash: '0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e',
//     date: Date.now(),
//     type: 'deposit',
//     from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
//     to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
//     amountUSD: 10,
//     amount: '0.01',
//     token: 'POL'
//   },
//   {
//     txHash: '0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55f',
//     date: Date.now(),
//     type: 'transfer',
//     from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
//     to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
//     amountUSD: 10,
//     amount: '0.01',
//     token: 'POL'
//   }
// ])

const { result, error } = useQuery(gql`
  query GetTransfers {
    transfers {
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
    }
  }
`)

const transactionData = computed<ExpenseTransaction[]>(() =>
  result.value?.transfers
    ? result.value.transfers.map((transaction: Record<string, string>) => ({
        txHash: transaction.transactionHash,
        date: new Date(Number(transaction.blockTimestamp) * 1000).toLocaleString('en-US'),
        from: transaction.from,
        to: transaction.to,
        amountUSD: 10,
        amount: formatEtherUtil(BigInt(transaction.amount), transaction.tokenAddress),
        token: tokenSymbol(transaction.tokenAddress),
        type: 'transfer'
      }))
    : []
)

const handleReceiptClick = (transaction: BaseTransaction) => {
  // Handle receipt click if needed
  console.log('Receipt clicked:', transaction as ExpenseTransaction)
}

watch(error, (newError) => {
  if (newError) {
    log.error('useQueryError: ', newError)
  }
})

watch(result, (newData) => {
  if (newData) {
    console.log(`newData`, newData)
    console.log(`transactionData`, transactionData.value)
    console.log(`typeof transaction.amount`, Number(BigInt(newData.transfers[0].amount)) / 10e6)
  }
})
</script>

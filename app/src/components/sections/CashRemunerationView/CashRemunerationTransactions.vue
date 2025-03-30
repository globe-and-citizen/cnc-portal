<template>
  <GenericTransactionHistory
    v-if="transactionData.length > 0"
    :transactions="transactionData"
    data-test="cash-remuneration-transactions"
    title="Cash Remuneration Transactions History"
    :currencies="['USD', 'CAD', 'INR', 'EUR']"
    :currency-rates="{
      loading: false,
      error: null,
      getRate: () => 1
    }"
    :show-receipt-modal="true"
    @receipt-click="handleReceiptClick"
  ></GenericTransactionHistory>
</template>
<script setup lang="ts">
import GenericTransactionHistory from '@/components/GenericTransactionHistory.vue'
import { useTeamStore } from '@/stores'
import type { BaseTransaction, CashRemunerationTransaction } from '@/types/transactions'
import { formatEtherUtil, log, tokenSymbol } from '@/utils'
import type { ReceiptData } from '@/utils/excelExport'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import { computed, ref, watch } from 'vue'
import { type Address } from 'viem'

const teamStore = useTeamStore()
const contractAddress = teamStore.currentTeam?.teamContracts.find(
  (contract) => contract.type === 'CashRemunerationEIP712'
)?.address as Address

const { result, error } = useQuery(
  gql`
    query GetCashRemunerationTransactions($contractAddress: Bytes!) {
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

const transactionData = computed<CashRemunerationTransaction[]>(() => {
  return result.value?.transactions
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
})

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

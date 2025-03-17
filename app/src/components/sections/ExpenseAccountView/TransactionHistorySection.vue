<template>
  <GenericTransactionHistory
    :transactions="transactions"
    title="Transaction History"
    :currencies="['USD']"
    :currency-rates="{
      loading: false,
      error: null,
      getRate: () => 1
    }"
    @receipt-click="handleReceiptClick"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GenericTransactionHistory from '@/components/GenericTransactionHistory.vue'
import type { ExpenseTransaction, BaseTransaction } from '@/types/transactions'
import type { ReceiptData } from '@/utils/excelExport'

interface Props {
  transactions: ExpenseTransaction[]
}

defineProps<Props>()

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
</script>

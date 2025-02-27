<template>
  <h1 class="font-bold text-2xl mb-5">Receipt</h1>
  <hr />
</template>
<script setup lang="ts">
interface ReceiptData {
  txHash: string
  date: string
  type: string
  from: string
  to: string
  amountUsd: number
  amountCad: number
  receipt: string
  amount: string
  token: string
}
defineProps<{ receiptData: Partial<ReceiptData> }>()
</script>

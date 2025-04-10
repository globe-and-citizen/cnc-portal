<template>
  <div>
    <h1 class="font-bold text-2xl mb-5">Receipt</h1>
    <hr />

    <!-- Render key-value pairs in a specific order -->
    <div
      v-for="key in orderedKeys"
      :key="key"
      class="flex justify-between py-2 border-b"
      :data-test="`receipt-data-${key}`"
    >
      <span class="font-medium text-gray-700">{{ labels[key as keyof typeof labels] }}:</span>
      <span class="text-gray-900">{{ formattedReceiptData[key as keyof typeof labels] }}</span>
    </div>
    <div class="modal-action justify-center">
      <ButtonUI variant="primary" @click="handleExportPdf" data-test="export-pdf">
        Export in PDF
      </ButtonUI>
      <ButtonUI variant="primary" @click="handleExportExcel" data-test="export-excel">
        Export in Excel
      </ButtonUI>
    </div>
  </div>
</template>
<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import type { ReceiptData } from '@/utils/excelExport'

const { receiptData } = defineProps<{ receiptData: Partial<ReceiptData> }>()

const emit = defineEmits<{
  (e: 'export-excel', data: ReceiptData): void
  (e: 'export-pdf', data: ReceiptData): void
}>()

const labels = {
  txHash: 'Transaction Hash',
  date: 'Date',
  type: 'Type',
  from: 'Author',
  to: 'Recipient',
  amountUSD: 'Value',
  amount: 'Amount',
  token: 'Token'
}

// Define the order of keys explicitly
const orderedKeys = ['txHash', 'token', 'amount', 'amountUSD', 'date', 'from', 'to']

const formattedReceiptData = {
  ...receiptData,
  txHash: `${receiptData['txHash']?.slice(0, 6)}...${receiptData['txHash']?.slice(-4)}`,
  from: `${receiptData['from']?.slice(0, 6)}...${receiptData['from']?.slice(-4)}`,
  to: `${receiptData['to']?.slice(0, 6)}...${receiptData['to']?.slice(-4)}`
}

const handleExportExcel = () => {
  emit('export-excel', receiptData as ReceiptData)
}

const handleExportPdf = () => {
  emit('export-pdf', receiptData as ReceiptData)
}
</script>

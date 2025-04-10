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
      <span v-if="key === 'txHash'" class="text-gray-900">
        <a
          v-if="receiptData['txHash']"
          :href="getBlockExplorerUrl(receiptData['txHash']!)"
          target="_blank"
        >
          {{ formatHash(receiptData['txHash']) }}
        </a>
      </span>
      <span v-else-if="key === 'from' || key === 'to'" class="text-gray-900">
        <a
          v-if="receiptData[key]"
          :href="getBlockExplorerUrl(receiptData[key]!, 'address')"
          target="_blank"
        >
          {{ formatHash(receiptData[key]) }}
        </a>
      </span>
      <span v-else class="text-gray-900">{{
        formattedReceiptData[key as keyof typeof labels]
      }}</span>
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
import { useCurrencyStore } from '@/stores/currencyStore'
import { storeToRefs } from 'pinia'
import { NETWORK } from '@/constant'

const { receiptData } = defineProps<{ receiptData: Partial<ReceiptData> }>()
const currencyStore = useCurrencyStore()
const { nativeTokenPrice, nativeTokenPriceInUSD } = storeToRefs(currencyStore)

const emit = defineEmits<{
  (e: 'export-excel', data: ReceiptData): void
  (e: 'export-pdf', data: ReceiptData): void
}>()

const labels = {
  txHash: 'Transaction Hash',
  token: 'Token',
  amount: 'Amount',
  price: 'Price',
  value: 'Value',
  date: 'Date',
  from: 'Author',
  to: 'Recipient'
}

// Define the order of keys explicitly
const orderedKeys = ['txHash', 'token', 'amount', 'price', 'value', 'date', 'from', 'to']

const getBlockExplorerUrl = (hash: string, type: 'tx' | 'address' = 'tx') => {
  return `${NETWORK.blockExplorerUrl}/${type}/${hash}`
}

const formatHash = (hash: string | undefined) => {
  if (!hash) return ''
  return `${hash.slice(0, 16)}...${hash.slice(-8)}`
}

const getUSDCConversionRate = () => {
  if (currencyStore.currency.code === 'USD') return '1 USD'
  if (!nativeTokenPrice.value || !nativeTokenPriceInUSD.value) return '1 USD'
  const exchangeRate = nativeTokenPrice.value / nativeTokenPriceInUSD.value
  return `${exchangeRate.toFixed(2)} ${currencyStore.currency.code} / 1 USD`
}

const formattedReceiptData = {
  ...receiptData,
  amount: `${receiptData['amount']} ${receiptData['token']}`,
  price:
    receiptData['token'] === 'USDC'
      ? getUSDCConversionRate()
      : `${nativeTokenPrice.value} ${currencyStore.currency.code} / ${receiptData['token']}`,
  value: receiptData['valueLocal'] || receiptData['valueUSD']
}

const handleExportExcel = () => {
  emit('export-excel', receiptData as ReceiptData)
}

const handleExportPdf = () => {
  emit('export-pdf', receiptData as ReceiptData)
}
</script>

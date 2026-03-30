<template>
  <UTable :data="transactions" :columns="columns">
    <template #txHash-cell="{ row: { original: row } }">
      <AddressToolTip :address="row.txHash" :slice="true" type="transaction" />
    </template>

    <template #date-cell="{ row: { original: row } }">{{ formatDate(String(row.date)) }}</template>

    <template #type-cell="{ row: { original: row } }">
      <span class="badge" :class="getTypeClass(row.type)">{{ row.type }}</span>
    </template>

    <template #from-cell="{ row: { original: row } }">
      <AddressToolTip :address="row.from" :slice="true" type="address" />
    </template>

    <template #to-cell="{ row: { original: row } }">
      <AddressToolTip :address="row.to" :slice="true" type="address" />
    </template>

    <template #amount-cell="{ row: { original: row } }">{{ row.amount }} {{ row.token }}</template>
    <template #amountUSD-cell="{ row: { original: row } }">
      {{ formatUSDAmount(row.amountUSD) }}
    </template>
  </UTable>
</template>

<script setup lang="ts">
import type { InvestorsTransaction } from '@/types/transactions'
import { formatCurrencyShort } from '@/utils'
import AddressToolTip from '@/components/AddressToolTip.vue'

defineProps<{
  transactions: InvestorsTransaction[]
}>()

const columns = [
  { accessorKey: 'txHash', header: 'Transaction' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'from', header: 'From' },
  { accessorKey: 'to', header: 'To' },
  { accessorKey: 'amount', header: 'Amount' },
  { accessorKey: 'amountUSD', header: 'USD Value' }
]

const formatUSDAmount = (amount: number): string => {
  try {
    return formatCurrencyShort(amount, 'USD')
  } catch (error) {
    console.error('Error formatting USD amount:', error)
    return '$0.00'
  }
}

const formatDate = (date: string) => {
  try {
    const dateObj = new Date(date)
    return dateObj.toLocaleString()
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

const getTypeClass = (type: string) => {
  return {
    'bg-success': type === 'mint',
    'bg-warning': type === 'dividend',
    'bg-info': type === 'transfer'
  }
}

defineExpose({
  columns,
  formatUSDAmount,
  formatDate,
  getTypeClass
})
</script>

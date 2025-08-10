<template>
  <TableComponent :rows="transactions" :columns="columns">
    <template #txHash-data="{ row }">
      <AddressToolTip :address="row.txHash" :slice="true" type="transaction" />
    </template>

    <template #date-data="{ row }">{{ formatDate(row.date) }}</template>

    <template #type-data="{ row }">
      <span class="badge" :class="getTypeClass(row.type)">{{ row.type }}</span>
    </template>

    <template #from-data="{ row }">
      <AddressToolTip :address="row.from" :slice="true" type="address" />
    </template>

    <template #to-data="{ row }">
      <AddressToolTip :address="row.to" :slice="true" type="address" />
    </template>

    <template #amount-data="{ row }">{{ row.amount }} {{ row.token }}</template>
    <template #amountUSD-data="{ row }">
      {{ formatUSDAmount(row.amountUSD) }}
    </template>
  </TableComponent>
</template>

<script setup lang="ts">
import type { InvestorsTransaction } from '@/types/transactions'
import TableComponent from '@/components/TableComponent.vue'
import { formatCurrencyShort } from '@/utils'
import AddressToolTip from '@/components/AddressToolTip.vue'

defineProps<{
  transactions: InvestorsTransaction[]
}>()

const columns = [
  { key: 'txHash', label: 'Transaction' },
  { key: 'date', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'To' },
  { key: 'amount', label: 'Amount' },
  { key: 'amountUSD', label: 'USD Value' }
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
</script>

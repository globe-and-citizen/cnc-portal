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
      {{ formatCurrencyShort(row.amountUSD, 'USD') }}
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

const formatDate = (date: string) => new Date(date).toLocaleString()

const getTypeClass = (type: string) => {
  return {
    'bg-success': type === 'mint',
    'bg-warning': type === 'dividend',
    'bg-info': type === 'transfer'
  }
}
</script>

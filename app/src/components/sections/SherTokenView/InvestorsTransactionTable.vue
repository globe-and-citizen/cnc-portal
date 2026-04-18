<template>
  <UTable :data="transactions" :columns="columns">
    <template #txHash-cell="{ row: { original: row } }">
      <AddressToolTip :address="row.txHash" :slice="true" type="transaction" />
    </template>

    <template #date-cell="{ row: { original: row } }">
      {{ formatDateShort(String(row.date)) }}
    </template>

    <template #type-cell="{ row: { original: row } }">
      <span class="badge" :class="getTypeClass(row.type)">{{ row.type }}</span>
    </template>

    <template #from-cell="{ row: { original: row } }">
      <AddressToolTip :address="row.from" :slice="true" type="address" />
    </template>

    <template #to-cell="{ row: { original: row } }">
      <AddressToolTip :address="row.to" :slice="true" type="address" />
    </template>

    <template #amount-cell="{ row: { original: row } }">
      {{ formatCryptoAmountWithPrecision(row.amount, 6, 6) }} {{ row.token }}
    </template>
    <template #amountUSD-cell="{ row: { original: row } }">
      {{ formatCurrencyShort(row.amountUSD, 'USD') }}
    </template>
  </UTable>
</template>

<script setup lang="ts">
import type { InvestorsTransaction } from '@/types/transactions'
import { formatCryptoAmountWithPrecision, formatCurrencyShort } from '@/utils'
import { formatDateShort } from '@/utils/dayUtils'
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

const getTypeClass = (type: string) => {
  const normalized = type.toLowerCase()
  return {
    'badge-success': normalized.includes('mint') || normalized.includes('paid'),
    'badge-warning': normalized.includes('distributed'),
    'badge-error': normalized.includes('failed'),
    'badge-info': normalized.includes('transfer')
  }
}
</script>

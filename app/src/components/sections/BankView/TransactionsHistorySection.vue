<!-- TransactionsHistorySection.vue -->
<template>
  <div class="card bg-base-100 w-full shadow-sm">
    <div class="card-body">
      <div class="flex flex-row justify-between">
        <span class="text-lg font-medium" data-test="transactions-history-title">
          Bank Transactions History
        </span>
        <div class="flex items-center gap-10">
          <Datepicker
            v-model="dateRange"
            class="w-96"
            range
            :format="'dd/MM/yyyy'"
            placeholder="Select Date Range"
            auto-apply
            data-test="date-range-picker"
          />
          <ButtonUI variant="success" @click="() => {}" data-test="export-button">
            Export
          </ButtonUI>
        </div>
      </div>

      <TableComponent :rows="filteredTransactions" :columns="columns">
        <template #hash-data="{ row }">
          <AddressToolTip :address="row.hash" :slice="true" type="transaction" />
        </template>
        <template #type-data="{ row }">
          <span
            class="badge"
            :class="{
              'badge-success': row.type === 'Deposit',
              'badge-info': row.type === 'Transfer'
            }"
          >
            {{ row.type }}
          </span>
        </template>
        <template #from-data="{ row }">
          <AddressToolTip :address="row.from" :slice="true" />
        </template>
        <template #to-data="{ row }">
          <AddressToolTip :address="row.to" :slice="true" />
        </template>
        <template #receipts-data="{ row }">
          <a
            :href="row.receipt"
            target="_blank"
            class="text-primary hover:text-primary-focus transition-colors duration-200 flex items-center gap-2"
          >
            <DocumentTextIcon class="h-4 w-4" />
            Receipt
          </a>
        </template>
      </TableComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DocumentTextIcon } from '@heroicons/vue/24/outline'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { NETWORK } from '@/constant'
import ButtonUI from '@/components/ButtonUI.vue'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

interface Transaction {
  hash: string
  date: string
  type: 'Deposit' | 'Transfer'
  from: string
  to: string
  amountUSD: number
  amountCAD: number
  receipt: string
}

// Example transaction data
const transactions = ref<Transaction[]>([
  {
    hash: '0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e',
    date: new Date().toLocaleDateString(),
    type: 'Deposit',
    from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    amountUSD: 10,
    amountCAD: 12,
    receipt: `${NETWORK.blockExplorerUrl}/tx/0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e`
  }
])

const columns = [
  { key: 'hash', label: 'Tx Hash', sortable: false },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'type', label: 'Type', sortable: false },
  { key: 'from', label: 'From', sortable: false },
  { key: 'to', label: 'To', sortable: false },
  { key: 'amountUSD', label: 'Amount (USD)', sortable: false },
  { key: 'amountCAD', label: 'Amount (CAD)', sortable: false },
  { key: 'receipts', label: 'Receipts', sortable: false }
] as TableColumn[]

// Date range state
const dateRange = ref<[Date, Date] | null>(null)

// Filter transactions based on date range
const filteredTransactions = computed(() => {
  if (!dateRange.value) return transactions.value

  const [startDate, endDate] = dateRange.value
  return transactions.value.filter((transaction) => {
    const txDate = new Date(transaction.date)
    return txDate >= startDate && txDate <= endDate
  })
})
</script>

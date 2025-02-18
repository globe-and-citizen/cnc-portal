<!-- TransactionsHistorySection.vue -->
<template>
  <div class="card bg-base-100 shadow-sm">
    <div class="card-body">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium" data-test="transactions-history-title">
          Bank Transactions History
        </h3>
        <div class="flex items-center gap-4">
          <div class="flex">
            <input
              class="input input-bordered join-item"
              placeholder="1st January"
              data-test="start-date-input"
            />
            <span class="join-item flex items-center px-2">-</span>
            <input
              class="input input-bordered join-item"
              placeholder="30 January"
              data-test="end-date-input"
            />
          </div>
          <button class="btn btn-success gap-2" data-test="export-button">
            Export
            <ArrowDownTrayIcon class="h-4 w-4" />
          </button>
        </div>
      </div>

      <TableComponent
        :rows="transactions"
        :columns="[
          { key: 'hash', label: 'Tx Hash', sortable: true },
          { key: 'date', label: 'Date', sortable: true },
          { key: 'type', label: 'Type', sortable: true },
          { key: 'from', label: 'From', sortable: true },
          { key: 'to', label: 'To', sortable: true },
          { key: 'amountUSD', label: 'Amount (USD)', sortable: true },
          { key: 'amountCAD', label: 'Amount (CAD)', sortable: true },
          { key: 'receipts', label: 'Receipts' }
        ]"
      >
        <template #type-data="{ row }">
          <span :class="`badge ${row.type === 'Deposit' ? 'badge-success' : 'badge-error'}`">
            {{ row.type }}
          </span>
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

      <!-- Pagination -->
      <div class="flex justify-between items-center mt-4">
        <div class="text-sm text-gray-600">
          Rows per page:
          <select class="select select-bordered select-sm w-20" v-model="rowsPerPage">
            <option>20</option>
            <option>50</option>
            <option>100</option>
          </select>
        </div>
        <div class="join">
          <button
            class="join-item btn btn-sm"
            @click="prevPage"
            :disabled="currentPage === 1"
            data-test="prev-page-button"
          >
            «
          </button>
          <button class="join-item btn btn-sm">{{ paginationText }}</button>
          <button
            class="join-item btn btn-sm"
            @click="nextPage"
            :disabled="isLastPage"
            data-test="next-page-button"
          >
            »
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/vue/24/outline'
import TableComponent from '@/components/TableComponent.vue'

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

const props = defineProps<{
  transactions: Transaction[]
}>()

const rowsPerPage = ref(20)
const currentPage = ref(1)

const totalPages = computed(() => Math.ceil(props.transactions.length / rowsPerPage.value))
const isLastPage = computed(() => currentPage.value >= totalPages.value)

const paginationText = computed(() => {
  const start = (currentPage.value - 1) * rowsPerPage.value + 1
  const end = Math.min(currentPage.value * rowsPerPage.value, props.transactions.length)
  return `${start}-${end} of ${props.transactions.length}`
})

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}
</script>

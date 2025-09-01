<template>
  <CardComponent title="My Approved Expense">
    <div v-if="newExpenseData">
      <!-- TODO display this only if the use have an approved expense -->
      <!-- Expense A/c Info Section -->
      <!-- New Header -->
      <TableComponent
        :rows="getCurrentUserExpenses(newExpenseData, currentUserAddress)"
        :columns="columns"
      >
        <template #action-data="{ row }">
          <TransferAction :row="row as ExpenseResponse" />
        </template>
        <template #expiryDate-data="{ row }">
          <span>{{ new Date(Number(row.data.expiry) * 1000).toLocaleString('en-US') }}</span>
        </template>
        <template #maxAmountPerTx-data="{ row }">
          <span>
            {{ row.data.budgetData[2]?.value }} {{ tokenSymbol(row.data.tokenAddress) }}
          </span>
        </template>
        <template #transactions-data="{ row }">
          <span>{{ row.balances[0] }}/{{ row.data.budgetData[0]?.value }} TXs</span>
        </template>
        <template #amountTransferred-data="{ row }">
          <span
            >{{ row.balances[1] }}/{{ row.data.budgetData[1]?.value }}
            {{ tokenSymbol(row.data.tokenAddress) }}</span
          >
        </template>
      </TableComponent>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
//#region Imports
import { computed } from 'vue'
import type { ExpenseResponse } from '@/types'
import CardComponent from '@/components/CardComponent.vue'
import { useUserDataStore, useTeamStore } from '@/stores'
import { tokenSymbol, getCurrentUserExpenses } from '@/utils'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import { useTanstackQuery } from '@/composables'
import TransferAction from './TransferAction.vue'
//#endregion

const teamStore = useTeamStore()
const currentUserAddress = useUserDataStore().address

const {
  data: newExpenseData
  // isLoading: isFetchingExpenseData,
  // error: errorFetchingExpenseData
} = useTanstackQuery<ExpenseResponse[]>(
  'expenseData',
  computed(() => `/expense?teamId=${teamStore.currentTeamId}`),
  {
    queryKey: ['getExpenseData'],
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  }
)

const columns = [
  {
    key: 'expiryDate',
    label: 'Expiry Date',
    sortable: true
  },
  {
    key: 'maxAmountPerTx',
    label: 'Max Ammount Per Tx',
    sortable: false
  },
  {
    key: 'transactions',
    label: 'Max Transactions',
    sortable: false
  },
  {
    key: 'amountTransferred',
    label: 'Max Amount',
    sortable: false
  },
  {
    key: 'action',
    label: 'Action',
    sortable: false
  }
] as TableColumn[]
</script>

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
          <TransferAction :row="row" />
        </template>
        <template #startDate-data="{ row }">
          <span>{{ new Date(Number(row.data.startDate) * 1000).toLocaleString('en-US') }}</span>
        </template>
        <template #endDate-data="{ row }">
          <span>{{ new Date(Number(row.data.endDate) * 1000).toLocaleString('en-US') }}</span>
        </template>
        <template #frequencyType-data="{ row }">
          <span> {{ row.data.frequencyType }} </span>
        </template>
        <template #amountTransferred-data="{ row }">
          <span
            >{{ row.balances[1] }}/{{ row.data.amount }}
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
    refetchOnWindowFocus: true
  }
)

const columns = [
  {
    key: 'startDate',
    label: 'Start Date',
    sortable: true
  },
  {
    key: 'endDate',
    label: 'End Date',
    sortable: true
  },
  {
    key: 'frequencyType',
    label: 'Frequency',
    sortable: false
  },
  /* {
    key: '',
    label: 'Max Transactions',
    sortable: false
  }, */
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

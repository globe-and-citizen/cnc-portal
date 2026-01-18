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
          <span>
            {{
              row.data.frequencyType == 4
                ? getCustomFrequency(row.data.customFrequency)
                : getFrequencyType(row.data.frequencyType)
            }}
          </span>
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
import { useExpensesQuery } from '@/queries'
import TransferAction from './TransferAction.vue'
import { getFrequencyType, getCustomFrequency } from '@/utils'
//#endregion

const teamStore = useTeamStore()
const currentUserAddress = useUserDataStore().address

const {
  data: newExpenseData
  // isLoading: isFetchingExpenseData,
  // error: errorFetchingExpenseData
} = useExpensesQuery(() => teamStore.currentTeamId)

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

<template>
  <UCard>
    <template #header>My Approved Expense</template>
    <div v-if="newExpenseData">
      <!-- TODO display this only if the use have an approved expense -->
      <!-- Expense A/c Info Section -->
      <!-- New Header -->
      <UTable :data="getCurrentUserExpenses(newExpenseData, currentUserAddress)" :columns="columns">
        <template #action-cell="{ row: { original: row } }">
          <TransferAction :row="row" />
        </template>
        <template #startDate-cell="{ row: { original: row } }">
          <span>{{ new Date(Number(row.data.startDate) * 1000).toLocaleString('en-US') }}</span>
        </template>
        <template #endDate-cell="{ row: { original: row } }">
          <span>{{ new Date(Number(row.data.endDate) * 1000).toLocaleString('en-US') }}</span>
        </template>
        <template #frequencyType-cell="{ row: { original: row } }">
          <span>
            {{
              row.data.frequencyType == 4
                ? getCustomFrequency(Number(row.data.customFrequency))
                : getFrequencyType(row.data.frequencyType)
            }}
          </span>
        </template>
        <template #amountTransferred-cell="{ row: { original: row } }">
          <span
            >{{ row.balances[1] }}/{{ row.data.amount }}
            {{ tokenSymbol(row.data.tokenAddress) }}</span
          >
        </template>
      </UTable>
    </div>
  </UCard>
</template>

<script setup lang="ts">
//#region Imports
import { computed } from 'vue'
import { useUserDataStore, useTeamStore } from '@/stores'
import { tokenSymbol, getCurrentUserExpenses } from '@/utils'
import { useGetExpensesQuery } from '@/queries'
import TransferAction from './TransferAction.vue'
import { getFrequencyType, getCustomFrequency } from '@/utils'
//#endregion

const teamStore = useTeamStore()
const currentUserAddress = useUserDataStore().address

const { data: newExpenseData } = useGetExpensesQuery({
  queryParams: { teamId: computed(() => teamStore.currentTeamId) }
})

const columns = [
  {
    accessorKey: 'startDate',
    header: 'Start Date',
    enableSorting: true
  },
  {
    accessorKey: 'endDate',
    header: 'End Date',
    enableSorting: true
  },
  {
    accessorKey: 'frequencyType',
    header: 'Frequency',
    enableSorting: false
  },
  {
    accessorKey: 'amountTransferred',
    header: 'Max Amount',
    enableSorting: false
  },
  {
    accessorKey: 'action',
    header: 'Action',
    enableSorting: false
  }
]
</script>

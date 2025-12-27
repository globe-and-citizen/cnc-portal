import { useToastStore, useUserDataStore, useTeamStore } from '@/stores'
import { log } from '@/utils/generalUtil'
import { defineStore } from 'pinia'
import { computed, onMounted, watch } from 'vue'
import { useExpenses } from '@/queries/expense.queries'

export const useExpenseDataStore = defineStore('expense', () => {
  // TODO: fetch teams on mounted
  // Having caching system,
  // And trigger fetch on demand
  // Update cache system.

  const userDataStore = useUserDataStore()
  const teamStore = useTeamStore()
  const { addErrorToast } = useToastStore()

  const {
    data: allExpenseData,
    isLoading: allExpenseDataIsFetching,
    error: allExpenseDataError,
    refetch: executeFetchAllExpenseData
  } = useExpenses(() => teamStore.currentTeamId)

  const myApprovedExpenses = computed(() => {
    if (allExpenseData.value) {
      const expenses = allExpenseData.value.map((expense) => ({
        ...expense.data,
        signature: expense.signature
      }))
      return expenses.filter((expense) => expense.approvedAddress === userDataStore.address)
    }
    return []
  })

  const allExpenseDataParsed = computed(() => {
    if (allExpenseData.value) {
      return allExpenseData.value.map((expense) => ({
        ...expense.data,
        ...expense
      }))
    }
    return []
  })

  const fetchAllExpenseData = async () => {
    // Note: TanStack Query will automatically refetch when teamId changes
    await executeFetchAllExpenseData()
  }

  watch(allExpenseDataError, (newError) => {
    if (newError) {
      log.error('Failed to load expense data \n', allExpenseDataError.value)
      addErrorToast('Failed to load expense data')
    }
  })

  const reloadExpenseData = async () => {
    if (allExpenseDataIsFetching.value) return
    else {
      await executeFetchAllExpenseData()
    }
  }

  // Fetch expense data on mounted
  // Todo count how many time it's called or mounted
  onMounted(async () => {
    await reloadExpenseData()
  })

  return {
    myApprovedExpenses,
    fetchAllExpenseData,
    allExpenseData,
    allExpenseDataParsed,
    allExpenseDataError,
    allExpenseDataIsFetching
  }
})

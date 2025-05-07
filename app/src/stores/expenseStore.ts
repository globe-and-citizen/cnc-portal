import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore, useUserDataStore, useTeamStore } from '@/stores'
import type { ExpenseResponse } from '@/types'
import { log } from '@/utils/generalUtil'
import { defineStore } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'

export const useExpenseDataStore = defineStore('expense', () => {
  // TODO: fetch teams on mounted
  // Having caching system,
  // And trigger fetch on demand
  // Update cache system.

  const userDataStore = useUserDataStore()
  const teamStore = useTeamStore()
  const { addErrorToast } = useToastStore()

  const allExpenseURI = ref<string>(`/expense?teamId=${teamStore.currentTeamId}`)

  const {
    isFetching: allExpenseDataIsFetching,
    error: allExpenseDataError,
    data: allExpenseData,
    execute: executeFetchAllExpenseData,
    statusCode: allExpenseDataStatusCode
  } = useCustomFetch(allExpenseURI, { immediate: false }).get().json<ExpenseResponse[]>()

  const myApprovedExpenses = computed(() => {
    if (allExpenseData.value) {
      const expenses = allExpenseData.value.map((expense) => ({
        // ...JSON.parse(expense.data),
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
        // ...JSON.parse(expense.data),
        ...expense.data,
        ...expense
      }))
    }
    return []
  })

  const fetchAllExpenseData = async (teamId = teamStore.currentTeamId) => {
    allExpenseURI.value = `/expense?teamId=${teamId}`
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
    // console.log('allExpenseData', allExpenseData.value)
  })

  return {
    myApprovedExpenses,
    fetchAllExpenseData,
    allExpenseData,
    allExpenseDataParsed,
    allExpenseDataError,
    allExpenseDataIsFetching,
    allExpenseDataStatusCode
  }
})

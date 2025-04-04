import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore, useUserDataStore } from '@/stores'
import type { ManyExpenseResponse } from '@/types'
import { log } from '@/utils/generalUtil'
import { defineStore } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

export const useExpenseDataStore = defineStore('expense', () => {
  // TODO: fetch teams on mounted
  // Having caching system,
  // And trigger fetch on demand
  // Update cache system.

  const userDataStore = useUserDataStore()
  const route = useRoute()
  const { addErrorToast } = useToastStore()

  const allExpenseURI = ref<string>(`/expense?teamId=${route.params.id}`)

  const {
    isFetching: allExpenseDataIsFetching,
    error: allExpenseDataError,
    data: allExpenseData,
    execute: executeFetchAllExpenseData,
    statusCode: allExpenseDataStatusCode
  } = useCustomFetch(allExpenseURI, { immediate: false }).get().json()

  const myApprovedExpenses = computed(() => {
    if (allExpenseData.value) {
      const expenses = allExpenseData.value.map(
        (expense: { data: string; signature: `0x${string}` }) => ({
          ...JSON.parse(expense.data),
          signature: expense.signature
        })
      )
      return expenses.filter(
        (expense: ManyExpenseResponse) => expense.approvedAddress === userDataStore.address
      )
    }
    return []
  })

  const fetchAllExpenseData = async (teamId: string) => {
    allExpenseURI.value = `/expense?teamId=${teamId}`
    await executeFetchAllExpenseData()
    return {
      allExpenseData,
      allExpenseDataError,
      allExpenseDataIsFetching
    }
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
    allExpenseDataError,
    allExpenseDataIsFetching,
    allExpenseDataStatusCode
  }
})

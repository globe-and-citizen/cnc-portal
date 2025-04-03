import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore, useUserDataStore } from '@/stores'
import { log } from '@/utils/generalUtil'
import { defineStore } from 'pinia'
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

export const useExpenseDataStore = defineStore('expense', () => {
  // TODO: fetch teams on mounted
  // Having caching system,
  // And trigger fetch on demand
  // Update cache system.

  const userDataStore = useUserDataStore()
  const route = useRoute()
  const { addErrorToast } = useToastStore()

  const expenseURI = ref<string>(`teams/${route.params.id}/expense-data`)

  /**
   * @description Fetch expense data by id
   * @returns team, teamIsFetching, teamError, executeFetchTeam
   */
  const {
    isFetching: expenseDataIsFetching,
    error: expenseDataError,
    data: expenseData,
    execute: executeFetchExpenseData,
    statusCode
  } = useCustomFetch(expenseURI, {
    immediate: false,
    beforeFetch: async ({ options, url, cancel }) => {
      options.headers = {
        memberaddress: userDataStore.address,
        'Content-Type': 'application/json',
        ...options.headers
      }
      return { options, url, cancel }
    }
  })
    .get()
    .json()

  /**
   * @description Fetch user dat by id and update the team cache
   * @param teamId
   * @returns team, teamIsFetching, teamError, executeFetchTeam
   */
  const fetchExpenseData = async (teamId: string) => {
    expenseURI.value = `teams/${teamId}/expense-data`
    await executeFetchExpenseData()
    return {
      expenseDataIsFetching,
      expenseDataError,
      expenseData
    }
  }

  watch(expenseDataError, (newError) => {
    if (newError) {
      log.error('Failed to load expense data \n', expenseDataError.value)
      addErrorToast('Failed to load expense data')
    }
  })

  const reloadExpenseData = async () => {
    if (expenseDataIsFetching.value) return
    else {
      await executeFetchExpenseData()
    }
  }

  // Fetch expense data on mounted
  // Todo count how many time it's called or mounted
  onMounted(async () => {
    await reloadExpenseData()
  })

  return {
    fetchExpenseData,
    expenseData,
    expenseDataError,
    expenseDataIsFetching,
    statusCode
  }
})

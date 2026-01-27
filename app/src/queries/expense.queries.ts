import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { ExpenseResponse } from '@/types'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

/**
 * Fetch all expenses for a team
 *
 * @endpoint GET /expense
 * @params none
 * @queryParams { teamId: string }
 * @body none
 */
export const useExpensesQuery = (teamId: MaybeRefOrGetter<string | null>) => {
  return useQuery({
    queryKey: ['expenses', { teamId }],
    queryFn: async () => {
      // Query params: passed as URL query string (?teamId=xxx)
      const queryParams = { teamId: toValue(teamId) }

      const { data } = await apiClient.get<ExpenseResponse[]>('/expense', { params: queryParams })
      return data
    },
    enabled: () => !!toValue(teamId)
  })
}

/**
 * Mutation input for useAddExpenseMutation
 */
export type AddExpenseInput = Record<string, unknown>

/**
 * Add expense data with signature
 *
 * @endpoint POST /expense
 * @params none
 * @queryParams none
 * @body Record<string, unknown> - expense account data
 */
export const useAddExpenseMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: AddExpenseInput) => {
      const { data } = await apiClient.post('/expense', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    }
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { ExpenseResponse } from '@/types'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

/**
 * Fetch all expenses for a team
 */
export const useExpensesQuery = (teamId: MaybeRefOrGetter<string | null>) => {
  return useQuery({
    queryKey: ['expenses', { teamId }],
    queryFn: async () => {
      const id = toValue(teamId)
      if (!id) throw new Error('Team ID is required')
      const { data } = await apiClient.get<ExpenseResponse[]>(`/expense?teamId=${id}`)
      return data
    },
    enabled: () => !!toValue(teamId)
  })
}

/**
 * Add expense data with signature
 */
export const useAddExpenseMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (expenseAccountData: Record<string, unknown>) => {
      const { data } = await apiClient.post('/expense', expenseAccountData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    }
  })
}

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
 * Request body for adding an expense
 */
export interface AddExpenseBody {
  /** Expense account data including budget limits */
  data: {
    amount: bigint | number
    frequencyType: number
    customFrequency: bigint | number
    startDate: number
    endDate: number
    tokenAddress: string
    approvedAddress: string
  }
  /** Signature for the expense account data */
  signature?: `0x${string}` | string
  /** Team ID this expense belongs to */
  teamId?: string | number | string[]
}

/**
 * Add expense data with signature
 *
 * @endpoint POST /expense
 * @params none
 * @queryParams none
 * @body AddExpenseBody - expense account data
 */
export const useAddExpenseMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: AddExpenseBody) => {
      const { data } = await apiClient.post('/expense', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    }
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { ExpenseResponse } from '@/types'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

/**
 * Query key factory for expense-related queries
 */
export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (teamId: string | null) => [...expenseKeys.lists(), { teamId }] as const
}

// ============================================================================
// GET /expense - Fetch expenses
// ============================================================================

/**
 * Path parameters for GET /expense (none for this endpoint)
 */
export interface GetExpensesPathParams {}

/**
 * Query parameters for GET /expense
 */
export interface GetExpensesQueryParams {
  /** Team ID to filter expenses */
  teamId: MaybeRefOrGetter<string | null>
}

/**
 * Combined parameters for useGetExpensesQuery
 */
export interface GetExpensesParams {
  pathParams?: GetExpensesPathParams
  queryParams: GetExpensesQueryParams
}

/**
 * Fetch all expenses for a team
 *
 * @endpoint GET /expense
 * @pathParams none
 * @queryParams { teamId: string }
 * @body none
 */
export const useGetExpensesQuery = (params: GetExpensesParams) => {
  const { queryParams } = params

  return useQuery({
    queryKey: expenseKeys.list(toValue(queryParams.teamId)),
    queryFn: async () => {
      const teamId = toValue(queryParams.teamId)

      // Query params: passed as URL query string (?teamId=xxx)
      const apiQueryParams: { teamId: string } = { teamId: teamId! }

      const { data } = await apiClient.get<ExpenseResponse[]>('/expense', { params: apiQueryParams })
      return data
    },
    enabled: () => !!toValue(queryParams.teamId)
  })
}

// ============================================================================
// POST /expense - Create expense
// ============================================================================

/**
 * Request body for adding an expense
 */
export interface CreateExpenseBody {
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
 * @pathParams none
 * @queryParams none
 * @body CreateExpenseBody - expense account data
 */
export const useCreateExpenseMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: CreateExpenseBody) => {
      const { data } = await apiClient.post('/expense', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all })
    }
  })
}

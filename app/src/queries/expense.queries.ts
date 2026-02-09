import type { ExpenseResponse } from '@/types'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { createQueryHook, createMutationHook, queryPresets } from './queryFactory'

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
 * Combined parameters for useGetExpensesQuery
 */
export interface GetExpensesParams {
  queryParams: {
    /** Team ID to filter expenses */
    teamId: MaybeRefOrGetter<string | null>
  }
}

/**
 * Fetch all expenses for a team
 *
 * @endpoint GET /expense
 * @pathParams none
 * @queryParams { teamId: string }
 * @body none
 */
export const useGetExpensesQuery = createQueryHook<ExpenseResponse[], GetExpensesParams>({
  endpoint: 'expense',
  queryKey: (params) => expenseKeys.list(toValue(params.queryParams.teamId)),
  enabled: (params) => !!toValue(params.queryParams.teamId),
  options: queryPresets.moderate
})

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
 * Combined parameters for useCreateExpenseMutation
 */
export interface CreateExpenseParams {
  body: CreateExpenseBody
}

/**
 * Add expense data with signature
 *
 * @endpoint POST /expense
 * @pathParams none
 * @queryParams none
 * @body CreateExpenseBody - expense account data
 */
export const useCreateExpenseMutation = createMutationHook<unknown, CreateExpenseParams>({
  method: 'POST',
  endpoint: 'expense',
  invalidateKeys: [expenseKeys.all]
})

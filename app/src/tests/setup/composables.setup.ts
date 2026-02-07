import { vi } from 'vitest'
import { queryMocks } from '@/tests/mocks/query.mock'
import {
  mockUseBackendWake,
  mockUseAuth,
  mockUseContractBalance,
  mockUseSafeSendTransaction
} from '@/tests/mocks/composables.mock'

/**
 * Mock TanStack Vue Query
 * Provides a mock queryClient with mocked invalidateQueries method
 */
vi.mock('@tanstack/vue-query', async () => {
  const actual: object = await vi.importActual('@tanstack/vue-query')
  return {
    ...actual,
    useQueryClient: vi.fn(() => {
      return {
        invalidateQueries: vi.fn(),
        getQueryData: vi.fn(),
        setQueryData: vi.fn(),
        removeQueries: vi.fn()
      }
    }),
    useQuery: vi.fn(() => {
      return {
        data: vi.fn(),
        isLoading: vi.fn(),
        error: vi.fn()
      }
    })
  }
})

/**
 * Mock Team Queries (team.queries.ts)
 */
vi.mock('@/queries/team.queries', () => ({
  useGetTeamsQuery: vi.fn(queryMocks.useGetTeamsQuery),
  useGetTeamQuery: vi.fn(queryMocks.useGetTeamQuery),
  useCreateTeamMutation: vi.fn(queryMocks.useCreateTeamMutation),
  useUpdateTeamMutation: vi.fn(queryMocks.useUpdateTeamMutation),
  useDeleteTeamMutation: vi.fn(queryMocks.useDeleteTeamMutation),
  useGetSubmitRestrictionQuery: vi.fn(queryMocks.useGetSubmitRestrictionQuery)
}))

/**
 * Mock Member Queries (member.queries.ts)
 */
vi.mock('@/queries/member.queries', () => ({
  useAddMembersMutation: vi.fn(queryMocks.useAddMembersMutation),
  useDeleteMemberMutation: vi.fn(queryMocks.useDeleteMemberMutation)
}))

/**
 * Mock Wage Queries (wage.queries.ts)
 */
vi.mock('@/queries/wage.queries', () => ({
  useGetTeamWagesQuery: vi.fn(queryMocks.useGetTeamWagesQuery),
  useSetMemberWageMutation: vi.fn(queryMocks.useSetMemberWageMutation)
}))

/**
 * Mock Notification Queries (notification.queries.ts)
 */
vi.mock('@/queries/notification.queries', () => ({
  useGetNotificationsQuery: vi.fn(queryMocks.useGetNotificationsQuery),
  useCreateBulkNotificationsMutation: vi.fn(queryMocks.useCreateBulkNotificationsMutation),
  useUpdateNotificationMutation: vi.fn(queryMocks.useUpdateNotificationMutation)
}))

/**
 * Mock Expense Queries (expense.queries.ts)
 */
vi.mock('@/queries/expense.queries', () => ({
  useGetExpensesQuery: vi.fn(queryMocks.useGetExpensesQuery)
}))

/**
 * Mock User Queries (user.queries.ts)
 */
vi.mock('@/queries/user.queries', () => ({
  useGetUserQuery: vi.fn(queryMocks.useGetUserQuery),
  useGetUserNonceQuery: vi.fn(queryMocks.useGetUserNonceQuery),
  useUpdateUserMutation: vi.fn(queryMocks.useUpdateUserMutation),
  useGetSearchUsersQuery: vi.fn(queryMocks.useGetSearchUsersQuery)
}))

/**
 * Mock Action Queries (action.queries.ts)
 */
vi.mock('@/queries/action.queries', () => ({
  useGetBodActionsQuery: vi.fn(queryMocks.useGetBodActionsQuery),
  useCreateActionMutation: vi.fn(queryMocks.useCreateActionMutation),
  useUpdateActionMutation: vi.fn(queryMocks.useUpdateActionMutation),
  useCreateElectionNotificationsMutation: vi.fn(queryMocks.useCreateElectionNotificationsMutation)
}))

/**
 * Mock Auth Queries (auth.queries.ts)
 */
vi.mock('@/queries/auth.queries', () => ({
  useGetValidateTokenQuery: vi.fn(queryMocks.useGetValidateTokenQuery)
}))

/**
 * Mock Contract Queries (contract.queries.ts)
 */
vi.mock('@/queries/contract.queries', () => ({
  useCreateContractMutation: vi.fn(queryMocks.useCreateContractMutation),
  useSyncContractsMutation: vi.fn(queryMocks.useSyncContractsMutation),
  useResetContractsMutation: vi.fn(queryMocks.useResetContractsMutation)
}))

/**
 * Mock Health Queries (health.queries.ts)
 */
vi.mock('@/queries/health.queries', () => ({
  useGetBackendHealthQuery: vi.fn(queryMocks.useGetBackendHealthQuery)
}))

/**
 * Mock Weekly Claim Queries (weeklyClaim.queries.ts)
 */
vi.mock('@/queries/weeklyClaim.queries', () => ({
  useGetTeamWeeklyClaimsQuery: vi.fn(queryMocks.useGetTeamWeeklyClaimsQuery),
  useGetWeeklyClaimByIdQuery: vi.fn(queryMocks.useGetWeeklyClaimByIdQuery),
  useUpdateWeeklyClaimMutation: vi.fn(queryMocks.useUpdateWeeklyClaimMutation),
  useSyncWeeklyClaimsMutation: vi.fn(queryMocks.useSyncWeeklyClaimsMutation),
  useDeleteClaimMutation: vi.fn(queryMocks.useDeleteClaimMutation)
}))

/**
 * Mock Safe Queries (safe.queries.ts)
 */
vi.mock('@/queries/safe.queries', () => ({
  useGetSafeInfoQuery: vi.fn(queryMocks.useGetSafeInfoQuery),
  useSafePendingTransactionsQuery: vi.fn(queryMocks.useSafePendingTransactionsQuery),
  useDeploySafeMutation: vi.fn(queryMocks.useDeploySafeMutation),
  useProposeTransactionMutation: vi.fn(queryMocks.useProposeTransactionMutation),
  useApproveTransactionMutation: vi.fn(queryMocks.useApproveTransactionMutation),
  useExecuteTransactionMutation: vi.fn(queryMocks.useExecuteTransactionMutation),
  useUpdateSafeOwnersMutation: vi.fn(queryMocks.useUpdateSafeOwnersMutation),
  useGetSafeTransactionQuery: vi.fn(queryMocks.useGetSafeTransactionQuery)
}))

/**
 * Mock Polymarket Queries (polymarket.queries.ts)
 */
vi.mock('@/queries/polymarket.queries', () => ({
  useGetMarketDataQuery: vi.fn(queryMocks.useGetMarketDataQuery),
  useGetSafeBalancesQuery: vi.fn(queryMocks.useGetSafeBalancesQuery)
}))

/**
 * Mock useBackendWake composable
 */
vi.mock('@/composables/useBackendWake', () => ({
  useBackendWake: mockUseBackendWake
}))

/**
 * Mock useAuth composable
 */
vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => mockUseAuth)
}))

/**
 * Mock useContractBalance composable
 */
vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockUseContractBalance)
}))

/**
 * Mock useSafeSendTransaction composable
 */
vi.mock('@/composables/transactions/useSafeSendTransaction', () => ({
  useSafeSendTransaction: vi.fn(() => mockUseSafeSendTransaction)
}))

import { vi } from 'vitest'
import { queryMocks } from '@/tests/mocks/query.mock'

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
    })
  }
})

/**
 * Mock Team Queries (team.queries.ts)
 */
vi.mock('@/queries/team.queries', () => ({
  useTeamsQuery: vi.fn(queryMocks.useTeamsQuery),
  useTeamQuery: vi.fn(queryMocks.useTeamQuery),
  useCreateTeamMutation: vi.fn(queryMocks.useCreateTeamMutation),
  useUpdateTeamMutation: vi.fn(queryMocks.useUpdateTeamMutation),
  useDeleteTeamMutation: vi.fn(queryMocks.useDeleteTeamMutation)
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
  useTeamWagesQuery: vi.fn(queryMocks.useTeamWagesQuery),
  useSetMemberWageMutation: vi.fn(queryMocks.useSetMemberWageMutation)
}))

/**
 * Mock Notification Queries (notification.queries.ts)
 */
vi.mock('@/queries/notification.queries', () => ({
  useNotificationsQuery: vi.fn(queryMocks.useNotificationsQuery),
  useAddBulkNotificationsMutation: vi.fn(queryMocks.useAddBulkNotificationsMutation),
  useUpdateNotificationMutation: vi.fn(queryMocks.useUpdateNotificationMutation)
}))

/**
 * Mock Expense Queries (expense.queries.ts)
 */
vi.mock('@/queries/expense.queries', () => ({
  useExpensesQuery: vi.fn(queryMocks.useExpensesQuery)
}))

/**
 * Mock User Queries (user.queries.ts)
 */
vi.mock('@/queries/user.queries', () => ({
  useUserQuery: vi.fn(queryMocks.useUserQuery),
  useUserNonceQuery: vi.fn(queryMocks.useUserNonceQuery)
}))

/**
 * Mock Action Queries (action.queries.ts)
 */
vi.mock('@/queries/action.queries', () => ({
  useCreateActionMutation: vi.fn(queryMocks.useCreateActionMutation),
  useUpdateActionMutation: vi.fn(queryMocks.useUpdateActionMutation)
}))

/**
 * Mock Auth Queries (auth.queries.ts)
 */
vi.mock('@/queries/auth.queries', () => ({
  useValidateTokenQuery: vi.fn(queryMocks.useValidateTokenQuery)
}))

/**
 * Mock Contract Queries (contract.queries.ts)
 */
vi.mock('@/queries/contract.queries', () => ({
  useCreateContractMutation: vi.fn(queryMocks.useCreateContractMutation)
}))

/**
 * Mock Health Queries (health.queries.ts)
 */
vi.mock('@/queries/health.queries', () => ({
  useBackendHealthQuery: vi.fn(queryMocks.useBackendHealthQuery)
}))

/**
 * Mock Weekly Claim Queries (weeklyClaim.queries.ts)
 */
vi.mock('@/queries/weeklyClaim.queries', () => ({
  useTeamWeeklyClaimsQuery: vi.fn(queryMocks.useTeamWeeklyClaimsQuery),
  useMemberWeeklyClaimsQuery: vi.fn(queryMocks.useMemberWeeklyClaimsQuery),
  useWeeklyClaimByIdQuery: vi.fn(queryMocks.useWeeklyClaimByIdQuery),
  useSignWeeklyClaimMutation: vi.fn(queryMocks.useSignWeeklyClaimMutation),
  useEnableWeeklyClaimMutation: vi.fn(queryMocks.useEnableWeeklyClaimMutation),
  useDisableWeeklyClaimMutation: vi.fn(queryMocks.useDisableWeeklyClaimMutation),
  useWithdrawWeeklyClaimMutation: vi.fn(queryMocks.useWithdrawWeeklyClaimMutation),
  useSyncWeeklyClaimsMutation: vi.fn(queryMocks.useSyncWeeklyClaimsMutation)
}))

/**
 * Mock useBackendWake composable - returns a function that does nothing
 * Individual tests can override this mock if needed
 */
vi.mock('@/composables/useBackendWake', () => ({
  useBackendWake: vi.fn(() => {
    // No-op - just prevent the real implementation from being called
  })
}))

/**
 * Mock useAuth composable
 */
vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    logout: vi.fn(),
    login: vi.fn(),
    validateToken: vi.fn()
  }))
}))

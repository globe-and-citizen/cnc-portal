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
  useCreateTeamQuery: vi.fn(queryMocks.useCreateTeamQuery),
  useUpdateTeamQuery: vi.fn(queryMocks.useUpdateTeamQuery),
  useDeleteTeamQuery: vi.fn(queryMocks.useDeleteTeamQuery)
}))

/**
 * Mock Member Queries (member.queries.ts)
 */
vi.mock('@/queries/member.queries', () => ({
  useAddMembersQuery: vi.fn(queryMocks.useAddMembersQuery),
  useDeleteMemberQuery: vi.fn(queryMocks.useDeleteMemberQuery)
}))

/**
 * Mock Wage Queries (wage.queries.ts)
 */
vi.mock('@/queries/wage.queries', () => ({
  useTeamWagesQuery: vi.fn(queryMocks.useTeamWagesQuery),
  useSetMemberWageQuery: vi.fn(queryMocks.useSetMemberWageQuery)
}))

/**
 * Mock Notification Queries (notification.queries.ts)
 */
vi.mock('@/queries/notification.queries', () => ({
  useNotificationsQuery: vi.fn(queryMocks.useNotificationsQuery),
  useAddBulkNotificationsQuery: vi.fn(queryMocks.useAddBulkNotificationsQuery),
  useUpdateNotificationQuery: vi.fn(queryMocks.useUpdateNotificationQuery)
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
  useUpdateActionQuery: vi.fn(queryMocks.useUpdateActionQuery)
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
  useCreateContractQuery: vi.fn(queryMocks.useCreateContractQuery)
}))

/**
 * Mock Health Queries (health.queries.ts)
 */
vi.mock('@/queries/health.queries', () => ({
  useBackendHealthQuery: vi.fn(queryMocks.useBackendHealthQuery)
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

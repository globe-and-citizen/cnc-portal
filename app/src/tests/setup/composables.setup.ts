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
  useTeams: vi.fn(queryMocks.useTeams),
  useTeam: vi.fn(queryMocks.useTeam),
  useCreateTeam: vi.fn(queryMocks.useCreateTeam),
  useUpdateTeam: vi.fn(queryMocks.useUpdateTeam),
  useDeleteTeam: vi.fn(queryMocks.useDeleteTeam)
}))

/**
 * Mock Member Queries (member.queries.ts)
 */
vi.mock('@/queries/member.queries', () => ({
  useAddMembers: vi.fn(queryMocks.useAddMembers),
  useDeleteMember: vi.fn(queryMocks.useDeleteMember)
}))

/**
 * Mock Wage Queries (wage.queries.ts)
 */
vi.mock('@/queries/wage.queries', () => ({
  useTeamWages: vi.fn(queryMocks.useTeamWages),
  useSetMemberWage: vi.fn(queryMocks.useSetMemberWage)
}))

/**
 * Mock Notification Queries (notification.queries.ts)
 */
vi.mock('@/queries/notification.queries', () => ({
  useNotifications: vi.fn(queryMocks.useNotifications),
  useAddBulkNotifications: vi.fn(queryMocks.useAddBulkNotifications),
  useUpdateNotification: vi.fn(queryMocks.useUpdateNotification)
}))

/**
 * Mock Expense Queries (expense.queries.ts)
 */
vi.mock('@/queries/expense.queries', () => ({
  useExpenses: vi.fn(queryMocks.useExpenses)
}))

/**
 * Mock User Queries (user.queries.ts)
 */
vi.mock('@/queries/user.queries', () => ({
  useUser: vi.fn(queryMocks.useUser),
  useUserNonce: vi.fn(queryMocks.useUserNonce)
}))

/**
 * Mock Action Queries (action.queries.ts)
 */
vi.mock('@/queries/action.queries', () => ({
  useCreateActionQuery: vi.fn(queryMocks.useCreateActionQuery),
  useUpdateAction: vi.fn(queryMocks.useUpdateAction)
}))

/**
 * Mock Auth Queries (auth.queries.ts)
 */
vi.mock('@/queries/auth.queries', () => ({
  useValidateToken: vi.fn(queryMocks.useValidateToken)
}))

/**
 * Mock Contract Queries (contract.queries.ts)
 */
vi.mock('@/queries/contract.queries', () => ({
  useCreateContract: vi.fn(queryMocks.useCreateContract)
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

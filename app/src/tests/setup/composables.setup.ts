import { vi } from 'vitest'
import { queryMocks } from '@/tests/mocks/query.mock'

vi.mock('@tanstack/vue-query', async () => {
  const actual: object = await vi.importActual('@tanstack/vue-query')
  return {
    ...actual,
    useQueryClient: vi.fn(() => {
      return {
        invalidateQueries: vi.fn()
      }
    })
  }
})

vi.mock('@/queries/team.queries', () => ({
  useTeams: vi.fn(queryMocks.useTeams),
  useTeam: vi.fn(queryMocks.useTeam),
  useCreateTeam: vi.fn(queryMocks.useCreateTeam),
  useUpdateTeam: vi.fn(queryMocks.useUpdateTeam),
  useDeleteTeam: vi.fn(queryMocks.useDeleteTeam)
}))

vi.mock('@/queries/notification.queries', () => ({
  useNotifications: vi.fn(queryMocks.useNotifications),
  useAddBulkNotifications: vi.fn(queryMocks.useAddBulkNotifications),
  useUpdateNotification: vi.fn(queryMocks.useUpdateNotification)
}))

vi.mock('@/queries/expense.queries', () => ({
  useExpenses: vi.fn(queryMocks.useExpenses)
}))

vi.mock('@/queries/user.queries', () => ({
  useUser: vi.fn(queryMocks.useUser),
  useUserNonce: vi.fn(queryMocks.useUserNonce)
}))

vi.mock('@/queries/auth.queries', () => ({
  useValidateToken: vi.fn(queryMocks.useValidateToken)
}))

vi.mock('@/queries/action.queries', () => ({
  useCreateAction: vi.fn(queryMocks.useCreateAction),
  useUpdateAction: vi.fn(queryMocks.useUpdateAction)
}))

vi.mock('@/queries/wage.queries', () => ({
  useTeamWages: vi.fn(queryMocks.useTeamWages),
  useSetMemberWage: vi.fn(queryMocks.useSetMemberWage)
}))

vi.mock('@/composables', async () => {
  const actual: object = await vi.importActual('@/composables')
  return {
    ...actual,
    useTanstackQuery: vi.fn(queryMocks.useExpenses)
  }
})

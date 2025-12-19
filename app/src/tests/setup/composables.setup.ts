import { vi } from 'vitest'
import { ref } from 'vue'

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
  useTeams: vi.fn(() => ({
    data: ref([]),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn()
  })),
  useTeam: vi.fn(() => ({
    data: ref(null),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn()
  })),
  useCreateTeam: vi.fn(() => ({
    mutateAsync: vi.fn()
  })),
  useUpdateTeam: vi.fn(() => ({
    mutateAsync: vi.fn()
  })),
  useDeleteTeam: vi.fn(() => ({
    mutateAsync: vi.fn()
  }))
}))

vi.mock('@/queries/notification.queries', () => ({
  useNotifications: vi.fn(() => ({
    data: ref([]),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn()
  })),
  useAddBulkNotifications: vi.fn(() => ({
    mutateAsync: vi.fn()
  })),
  useUpdateNotification: vi.fn(() => ({
    mutateAsync: vi.fn()
  }))
}))

vi.mock('@/queries/expense.queries', () => ({
  useExpenses: vi.fn(() => ({
    data: ref([]),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn()
  }))
}))

vi.mock('@/queries/user.queries', () => ({
  useUser: vi.fn(() => ({
    data: ref(null),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn()
  })),
  useUserNonce: vi.fn(() => ({
    data: ref(null),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn()
  }))
}))

vi.mock('@/queries/auth.queries', () => ({
  useValidateToken: vi.fn(() => ({
    data: ref(null),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn()
  }))
}))

vi.mock('@/queries/action.queries', () => ({
  useCreateAction: vi.fn(() => ({
    mutateAsync: vi.fn()
  })),
  useUpdateAction: vi.fn(() => ({
    mutateAsync: vi.fn()
  }))
}))

vi.mock('@/composables', async () => {
  const actual: object = await vi.importActual('@/composables')
  return {
    ...actual,
    useTanstackQuery: vi.fn(() => {
      return {
        data: ref([]),
        isLoading: ref(false)
      }
    })
  }
})

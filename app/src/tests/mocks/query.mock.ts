import { ref } from 'vue'
import { vi } from 'vitest'
import type { Team, Member, Wage, Notification } from '@/types'
import type { HealthCheckResponse } from '@/queries/health.queries'

/**
 * Team Query Mocks
 */
export const mockTeamData: Team = {
  id: '1',
  name: 'Test Team',
  description: 'Test Team Description',
  members: [
    {
      address: '0x1234567890123456789012345678901234567890',
      name: 'Member 1',
      imageUrl: 'https://example.com/avatar1.jpg'
    },
    {
      address: '0x0987654321098765432109876543210987654321',
      name: 'Member 2',
      imageUrl: 'https://example.com/avatar2.jpg'
    },
    {
      address: '0x1111111111111111111111111111111111111111',
      name: 'Bob',
      imageUrl: 'https://example.com/avatar-bob.jpg'
    }
  ] as Member[],
  teamContracts: [
    {
      address: '0x1111111111111111111111111111111111111111',
      admins: ['0xAdminAddress'],
      type: 'InvestorV1',
      deployer: '0xDeployerAddress'
    }
  ],
  ownerAddress: '0x1234567890123456789012345678901234567890',
  officerAddress: '0x0987654321098765432109876543210987654321'
}

export const mockTeamsData: Team[] = [mockTeamData]


/**
 * Wage Query Mocks
 */
export const mockWageData: Wage[] = [
  {
    id: 1,
    teamId: 1,
    userAddress: '0x1234567890123456789012345678901234567890',
    maximumHoursPerWeek: 40,
    nextWageId: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ratePerHour: [
      { type: 'native', amount: 50 },
      { type: 'usdc', amount: 100 },
      { type: 'sher', amount: 25 }
    ]
  }
]

// export const mockWageResponse = createMockAxiosResponse(mockWageData)

/**
 * Notification Query Mocks
 */
export const mockNotificationData: Notification[] = [
  {
    id: 1,
    subject: 'Test Subject',
    message: 'Test notification message',
    isRead: false,
    userAddress: '0x1234567890123456789012345678901234567890',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    author: 'System',
    resource: 'test-resource'
  }
]

/**
 * Health Check Query Mocks
 */
export const mockHealthCheckData: HealthCheckResponse = {
  success: true,
  status: 'OK',
  timestamp: new Date().toISOString(),
  service: 'backend-api'
}

/**
 * Generic Query Hook Response Factory
 * Creates a standard TanStack Query response object with AxiosResponse data
 */
export const createMockQueryResponse = <T>(
  data: T,
  isLoading: boolean = false,
  error: Error | null = null
): Record<string, unknown> => ({
  data: ref(data),
  isLoading: ref(isLoading),
  error: ref(error),
  refetch: vi.fn(),
  isFetched: ref(true),
  isPending: ref(isLoading),
  isSuccess: ref(!error)
})

/**
 * Generic Mutation Hook Response Factory
 * Creates a standard TanStack Query mutation response object
 */
export const createMockMutationResponse = (): Record<string, unknown> => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn((data: unknown) => Promise.resolve(data)),
  isPending: ref(false),
  isError: ref(false),
  error: ref(null),
  data: ref(null),
  reset: vi.fn()
})

/**
 * Query Hook Mocks for use in vi.mock()
 * These are the functions that get mocked globally
 * Each mock corresponds to a query/mutation hook from @/queries/*
 */
export const queryMocks: Record<string, () => Record<string, unknown>> = {
  // Team queries - team.queries.ts
  useTeamsQuery: () => createMockQueryResponse(mockTeamsData),
  useTeamQuery: () => createMockQueryResponse(mockTeamData),
  useCreateTeamQuery: () => createMockMutationResponse(),
  useUpdateTeamQuery: () => createMockMutationResponse(),
  useDeleteTeamQuery: () => createMockMutationResponse(),

  // Member queries - member.queries.ts
  useAddMembersMutation: () => createMockMutationResponse(),
  useDeleteMemberQuery: () => createMockMutationResponse(),

  // Wage queries - wage.queries.ts
  useTeamWagesQuery: () => createMockQueryResponse(mockWageData),
  useSetMemberWageQuery: () => createMockMutationResponse(),

  // Notification queries - notification.queries.ts
  useNotificationsQuery: () => createMockQueryResponse(mockNotificationData),
  useAddBulkNotificationsQuery: () => createMockMutationResponse(),
  useUpdateNotificationQuery: () => createMockMutationResponse(),

  // Expense queries - expense.queries.ts
  useExpensesQuery: () => createMockQueryResponse([]),

  // User queries - user.queries.ts
  useUserQuery: () => createMockQueryResponse(null),
  useUserNonceQuery: () => createMockQueryResponse(null),

  // Action queries - action.queries.ts
  useCreateActionMutation: () => createMockMutationResponse(),
  useUpdateActionMutation: () => createMockMutationResponse(),

  // Auth queries - auth.queries.ts
  useValidateTokenQuery: () => createMockQueryResponse(null),

  // Contract queries - contract.queries.ts
  useCreateContractMutation: () => createMockMutationResponse(),

  // Health queries - health.queries.ts
  useBackendHealthQuery: () => createMockQueryResponse(mockHealthCheckData)
}

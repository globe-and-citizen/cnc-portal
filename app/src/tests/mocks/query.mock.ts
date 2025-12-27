import { ref } from 'vue'
import { vi } from 'vitest'
// import type { AxiosResponse } from 'axios'
import type { Team, Member, Wage, Notification } from '@/types'

/**
 * Factory function to create a mock AxiosResponse
 * This ensures all query mocks return consistent response structures
 */
// export const createMockAxiosResponse = <T>(
//   data: T,
//   status: number = 200,
//   statusText: string = 'OK'
// ): AxiosResponse<T> => ({
//   data,
//   status,
//   statusText,
//   headers: {},
//   config: {
//     url: '',
//     method: 'get',
//     headers: {}
//   } as unknown as import('axios').InternalAxiosRequestConfig
// })

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

// export const mockTeamResponse = createMockAxiosResponse(mockTeamData)
// export const mockTeamsResponse = createMockAxiosResponse(mockTeamsData)

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

// export const mockNotificationResponse = createMockAxiosResponse(mockNotificationData)

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
 */
export const queryMocks: Record<string, () => Record<string, unknown>> = {
  // Team queries
  useTeams: () => createMockQueryResponse(mockTeamsData),
  useTeam: () => createMockQueryResponse(mockTeamData),
  useCreateTeam: () => createMockMutationResponse(),
  useUpdateTeam: () => createMockMutationResponse(),
  useDeleteTeam: () => createMockMutationResponse(),

  // Wage queries
  useTeamWages: () => createMockQueryResponse(mockWageData),
  useSetMemberWage: () => createMockMutationResponse(),

  // Notification queries
  useNotifications: () => createMockQueryResponse(mockNotificationData),
  useAddBulkNotifications: () => createMockMutationResponse(),
  useUpdateNotification: () => createMockMutationResponse(),

  // Member queries
  useAddMembers: () => createMockMutationResponse(),
  useDeleteMember: () => createMockMutationResponse(),

  // Action queries
  useCreateAction: () => createMockMutationResponse(),
  useUpdateAction: () => createMockMutationResponse(),

  // Expense queries
  useExpenses: () => createMockQueryResponse([]),

  // User queries
  useUser: () => createMockQueryResponse(null),
  useUserNonce: () => createMockQueryResponse(null),

  // Auth queries
  useValidateToken: () => createMockQueryResponse(null),

  // Contract queries
  useCreateContract: () => createMockMutationResponse(),

  // Health queries
  useBackendHealthQuery: () => createMockQueryResponse({ status: 'ok' })
}

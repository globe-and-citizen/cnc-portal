import { ref } from 'vue'
import { vi } from 'vitest'
import type { Team, Member, Wage, Notification, WeeklyClaim } from '@/types'
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
 * Weekly Claim Query Mocks
 */
export const mockWeeklyClaimData: WeeklyClaim[] = [
  {
    id: 1,
    status: 'pending' as const,
    weekStart: '2024-01-01T00:00:00.000Z',
    memberAddress: '0x1234567890123456789012345678901234567890',
    teamId: 1,
    hoursWorked: 40,
    data: {},
    signature: null,
    wageId: 1,
    wage: mockWageData[0] as Wage,
    claims: [
      {
        id: 1,
        hoursWorked: 8,
        dayWorked: '2024-01-01',
        createdAt: '2024-01-01T08:00:00Z',
        updatedAt: '2024-01-01T08:00:00Z',
        memo: '',
        wageId: 1,
        wage: mockWageData[0] as Wage
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

export const mockSafeInfoData = {
  address: '0x1234567890123456789012345678901234567890',
  nonce: 0,
  threshold: 1,
  owners: ['0x1234567890123456789012345678901234567890'],
  masterCopy: '0xMasterCopyAddress',
  modules: [],
  fallbackHandler: '0xFallbackHandlerAddress',
  guard: '0x0000000000000000000000000000000000000000',
  version: '1.3.0'
}

export const mockSafeTransactionData = {
  safe: '0x1234567890123456789012345678901234567890',
  to: '0x0987654321098765432109876543210987654321',
  value: '0',
  data: '0x',
  operation: 0,
  gasToken: '0x0000000000000000000000000000000000000000',
  safeTxGas: 0,
  baseGas: 0,
  gasPrice: '0',
  refundReceiver: '0x0000000000000000000000000000000000000000',
  nonce: 0,
  executionDate: null,
  submissionDate: '2024-01-01T00:00:00Z',
  modified: '2024-01-01T00:00:00Z',
  blockNumber: null,
  transactionHash: null,
  safeTxHash: '0xTxHash',
  proposer: '0x1234567890123456789012345678901234567890',
  executor: null,
  isExecuted: false,
  isSuccessful: null,
  ethGasPrice: null,
  maxFeePerGas: null,
  maxPriorityFeePerGas: null,
  gasUsed: null,
  fee: null,
  origin: 'test',
  dataDecoded: null,
  confirmationsRequired: 1,
  confirmations: [],
  trusted: true,
  signatures: null
}

export const mockMarketData = {
  tokens: [
    {
      token_id: 'test-token',
      outcome: 'Yes',
      price: '0.50',
      volume: '1000'
    }
  ]
}

/**
 * BOD Action Query Mocks
 */
export const mockBodActionsData = [
  {
    id: 1,
    teamId: '1',
    actionType: 'ADD_MEMBER',
    status: 'pending',
    executionStatus: 'pending',
    data: {
      memberAddress: '0x1234567890123456789012345678901234567890',
      memberName: 'New Member'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

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
  useCreateTeamMutation: () => createMockMutationResponse(),
  useUpdateTeamMutation: () => createMockMutationResponse(),
  useDeleteTeamMutation: () => createMockMutationResponse(),

  // Member queries - member.queries.ts
  useAddMembersMutation: () => createMockMutationResponse(),
  useDeleteMemberMutation: () => createMockMutationResponse(),

  // Wage queries - wage.queries.ts
  useTeamWagesQuery: () => createMockQueryResponse(mockWageData),
  useSetMemberWageMutation: () => createMockMutationResponse(),

  // Notification queries - notification.queries.ts
  useNotificationsQuery: () => createMockQueryResponse(mockNotificationData),
  useAddBulkNotificationsMutation: () => createMockMutationResponse(),
  useUpdateNotificationMutation: () => createMockMutationResponse(),

  // Expense queries - expense.queries.ts
  useExpensesQuery: () => createMockQueryResponse([]),

  // User queries - user.queries.ts
  useUserQuery: () => createMockQueryResponse(null),
  useUserNonceQuery: () => createMockQueryResponse(null),

  // Action queries - action.queries.ts
  useBodActionsQuery: () => createMockQueryResponse(mockBodActionsData),
  useCreateActionMutation: () => createMockMutationResponse(),
  useUpdateActionMutation: () => createMockMutationResponse(),

  // Auth queries - auth.queries.ts
  useValidateTokenQuery: () => createMockQueryResponse(null),

  // Contract queries - contract.queries.ts
  useCreateContractMutation: () => createMockMutationResponse(),

  // Health queries - health.queries.ts
  useBackendHealthQuery: () => createMockQueryResponse(mockHealthCheckData),

  // Weekly Claim queries - weeklyClaim.queries.ts
  useTeamWeeklyClaimsQuery: () => createMockQueryResponse(mockWeeklyClaimData),
  useWeeklyClaimByIdQuery: () => createMockQueryResponse(mockWeeklyClaimData[0]),
  useUpdateWeeklyClaimMutation: () => createMockMutationResponse(),
  useSyncWeeklyClaimsMutation: () => createMockMutationResponse(),

  // Safe queries - safe.queries.ts
  useSafeInfoQuery: () => createMockQueryResponse(mockSafeInfoData),
  useSafePendingTransactionsQuery: () => createMockQueryResponse([]),
  useDeploySafeMutation: () => createMockMutationResponse(),
  useProposeTransactionMutation: () => createMockMutationResponse(),
  useApproveTransactionMutation: () => createMockMutationResponse(),
  useExecuteTransactionMutation: () => createMockMutationResponse(),
  useUpdateSafeOwnersMutation: () => createMockMutationResponse(),
  useSafeTransactionQuery: () => createMockQueryResponse(mockSafeTransactionData),

  // Polymarket queries - polymarket.queries.ts
  useMarketData: () => createMockQueryResponse(mockMarketData),
  useSafeBalances: () => createMockQueryResponse([])
}

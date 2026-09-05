import { beforeEach, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { queryMocks, resetNotificationsMock } from '@/tests/mocks/query.mock'
import {
  mockUseBackendWake,
  mockUseAuth,
  mockUseContractBalance,
  mockUseSafeSendTransaction,
  mockUseClipboard,
  useQueryClientFn,
  useQueryFn,
  useMutationFn,
  mockUseFetch,
  mockUseSubmitRestriction,
  mockUseDeployContract,
  mockUseUploadFileMutation,
  mockBlockTimestamp,
  resetComposableMocks,
  resetDeployState,
  resetUploadFileState
} from '@/tests/mocks/composables.mock'
import { mockGetFileUrlApi, mockUploadFileApi } from '@/tests/mocks/api.mock'
import {
  mockGetBalance,
  mockGetLogs,
  mockReadContractAction
} from '@/tests/mocks/viem.actions.mock'
import { mockRouter, mockRoute, resetMockRoute } from '@/tests/mocks/router.mock'

// Restore all shared composable mocks to their defaults before every test so
// that in-place mutations (refs, spies) never leak across tests. Setup-file
// `beforeEach` hooks run BEFORE spec-level ones, so per-test setup still wins.
beforeEach(() => {
  resetComposableMocks()
  resetDeployState()
  resetUploadFileState()
  resetNotificationsMock()
  resetMockRoute()
})

declare global {
  var __mockFetch: ReturnType<typeof vi.fn> | undefined
  var __mockUseStorageValue: unknown
}

if (!globalThis.__mockFetch) {
  globalThis.__mockFetch = vi.fn()
}

/**
 * Mock TanStack Vue Query
 * Provides a mock queryClient with mocked invalidateQueries method
 */
vi.mock('@tanstack/vue-query', async () => {
  const actual: object = await vi.importActual('@tanstack/vue-query')
  return {
    ...actual,
    useQueryClient: useQueryClientFn,
    useQuery: useQueryFn,
    useMutation: useMutationFn
  }
})

vi.mock('@/api', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    uploadFileApi: mockUploadFileApi,
    getFileUrlApi: mockGetFileUrlApi
  }
})

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRouter: vi.fn(() => mockRouter),
    RouterView: { name: 'RouterView', template: '<div data-test="router-view">Router View</div>' },
    // Returns the shared, mutable `mockRoute`. Override per-test via
    // `renderWithProviders(..., { route })` or `setMockRoute(...)`.
    useRoute: vi.fn(() => mockRoute)
  }
})

/**
 * Mock @vueuse/core
 */
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = (await importOriginal()) as {
    useStorage?: (...args: unknown[]) => unknown
    [key: string]: unknown
  }

  return {
    ...actual,
    useClipboard: vi.fn(() => mockUseClipboard),
    useStorage: vi.fn((key: string, initialValue: unknown, ...rest: unknown[]) => {
      if (globalThis.__mockUseStorageValue !== undefined) {
        const configuredValue = globalThis.__mockUseStorageValue
        if (
          typeof configuredValue === 'object' &&
          configuredValue !== null &&
          'value' in configuredValue
        ) {
          return configuredValue
        }

        return ref(configuredValue)
      }

      if (typeof actual.useStorage === 'function') {
        return actual.useStorage(key, initialValue, ...rest)
      }

      const fallbackValue = typeof initialValue === 'string' ? initialValue : ''
      return ref(fallbackValue)
    }),
    useFetch: vi.fn((url: string | { value: string }) => {
      const resolvedUrl = typeof url === 'string' ? url : url.value
      mockUseFetch.get.url.value = resolvedUrl
      return {
        post: () => ({
          json: () => ({
            data: mockUseFetch.post.data,
            execute: mockUseFetch.post.execute,
            error: mockUseFetch.post.error
          })
        }),
        get: () => ({
          json: () => ({
            data: mockUseFetch.get.data,
            execute: mockUseFetch.get.execute,
            error: mockUseFetch.get.error
          })
        })
      }
    })
  }
})

/**
 * Mock Team Queries (team.queries.ts)
 * Mirrors the real `teamKeys` factory so composables that invalidate queries
 * via `teamKeys.all` keep working under mock. Kept duplicated rather than
 * re-imported to avoid pulling the real module (which touches `@/constant`
 * and breaks specs that mock it partially).
 */
vi.mock('@/queries/team.queries', () => {
  const teamKeys = {
    all: ['teams'] as const,
    lists: () => ['teams', 'list'] as const,
    list: (
      userAddress?: string | null,
      filters?: { showHidden?: boolean; showArchived?: boolean }
    ) => ['teams', 'list', { userAddress, ...filters }] as const,
    details: () => ['teams', 'detail'] as const,
    detail: (teamId: string | null) => ['teams', 'detail', { teamId }] as const
  }
  return {
    teamKeys,
    useGetTeamsQuery: vi.fn(queryMocks.useGetTeamsQuery),
    useGetTeamQuery: vi.fn(queryMocks.useGetTeamQuery),
    useCreateTeamMutation: vi.fn(queryMocks.useCreateTeamMutation),
    useUpdateTeamMutation: vi.fn(queryMocks.useUpdateTeamMutation),
    useDeleteTeamMutation: vi.fn(queryMocks.useDeleteTeamMutation),
    useGetSubmitRestrictionQuery: vi.fn(queryMocks.useGetSubmitRestrictionQuery)
  }
})

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
vi.mock('@/queries/wage.queries', () => {
  // Mirror the real `wageKeys` factory so query invalidations keep working under
  // mock, regardless of test-file ordering. Duplicated rather than imported to
  // avoid pulling the real module (which touches `@/constant`).
  const wageKeys = {
    all: ['wages'] as const,
    teams: () => [...wageKeys.all, 'team'] as const,
    team: (teamId: string | number | null) => [...wageKeys.teams(), { teamId }] as const
  }

  return {
    wageKeys,
    useGetTeamWagesQuery: vi.fn(queryMocks.useGetTeamWagesQuery),
    useSetMemberWageMutation: vi.fn(queryMocks.useSetMemberWageMutation),
    useToggleWageStatusMutation: vi.fn(queryMocks.useToggleWageStatusMutation)
  }
})

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
 * Keep the real `expenseKeys` factory so query-key invalidations resolve correctly.
 */
vi.mock('@/queries/expense.queries', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/queries/expense.queries')>()),
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
 * Mirrors the real `contractKeys` factory so composables that invalidate
 * queries via `contractKeys.all` keep working under mock. Kept duplicated
 * rather than re-imported to avoid pulling the real module.
 */
vi.mock('@/queries/contract.queries', () => ({
  contractKeys: { all: ['contracts'] as const },
  useGetTeamOfficersQuery: vi.fn(() => ({
    data: ref([]),
    isPending: ref(false),
    isError: ref(false),
    refetch: vi.fn()
  })),
  useCreateContractMutation: vi.fn(queryMocks.useCreateContractMutation),
  useSyncContractsMutation: vi.fn(queryMocks.useSyncContractsMutation),
  useCreateOfficerMutation: vi.fn(queryMocks.useCreateOfficerMutation)
}))

/**
 * Mock File Queries (file.queries.ts)
 * Keeps the real `uploadSingleFile` pure function (its own spec exercises it)
 * while swapping the `useUploadFileMutation` hook for an inert mutation mock.
 */
vi.mock('@/queries/file.queries', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useUploadFileMutation: mockUseUploadFileMutation
  }
})

/**
 * Mock Investor Migration Queries (investorMigration.queries.ts)
 */
vi.mock('@/queries/investorMigration.queries', () => ({
  investorMigrationKeys: {
    all: ['investorMigration'] as const,
    team: (teamId: string | number) => ['investorMigration', String(teamId)] as const
  },
  useCreateInvestorMigrationMutation: vi.fn(queryMocks.useCreateInvestorMigrationMutation),
  useGetInvestorMigrationQuery: vi.fn(queryMocks.useGetInvestorMigrationQuery),
  useGenerateMerkleSnapshotMutation: vi.fn(queryMocks.useGenerateMerkleSnapshotMutation)
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
vi.mock('@/queries/weeklyClaim.queries', async (importOriginal) => {
  // Keep real non-hook exports (e.g. `weeklyClaimKeys`, response normalizers)
  // so components that reference them at runtime still work; only the query /
  // mutation hooks are swapped for mocks.
  const actual = await importOriginal<typeof import('@/queries/weeklyClaim.queries')>()
  return {
    ...actual,
    useGetTeamWeeklyClaimsQuery: vi.fn(queryMocks.useGetTeamWeeklyClaimsQuery),
    useGetWeeklyClaimByIdQuery: vi.fn(queryMocks.useGetWeeklyClaimByIdQuery),
    useUpdateWeeklyClaimMutation: vi.fn(queryMocks.useUpdateWeeklyClaimMutation),
    useEditClaimMutation: vi.fn(queryMocks.useEditClaimMutation),
    useEditClaimWithFilesMutation: vi.fn(queryMocks.useEditClaimWithFilesMutation),
    useSubmitClaimMutation: vi.fn(queryMocks.useSubmitClaimMutation),
    useSyncWeeklyClaimsMutation: vi.fn(queryMocks.useSyncWeeklyClaimsMutation),
    useDeleteClaimMutation: vi.fn(queryMocks.useDeleteClaimMutation)
  }
})

/**
 * Mock Safe Queries (safe.queries.ts)
 */
vi.mock('@/queries/safe.mutations', () => ({
  useGetSafeInfoQuery: vi.fn(queryMocks.useGetSafeInfoQuery),
  useSafePendingTransactionsQuery: vi.fn(queryMocks.useSafePendingTransactionsQuery),
  useApproveTransactionMutation: vi.fn(queryMocks.useApproveTransactionMutation),
  useExecuteTransactionMutation: vi.fn(queryMocks.useExecuteTransactionMutation),

  useGetSafeTransactionQuery: vi.fn(queryMocks.useGetSafeTransactionQuery)
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
// `importOriginal` keeps `contractBalanceKeys` real: specs assert on the key the
// component invalidates, and a hand-written factory would leave it undefined.
vi.mock('@/composables/useContractBalance', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useContractBalance: vi.fn(() => mockUseContractBalance)
  }
})

/**
 * Mock useDeployContract composable
 */
vi.mock('@/composables/useContractFunctions', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useDeployContract: mockUseDeployContract
  }
})

/**
 * Mock useSubmitRestriction composable
 */
vi.mock('@/composables', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useSubmitRestriction: vi.fn(() => mockUseSubmitRestriction)
  }
})

/**
 * Mock useSafeSendTransaction composable
 */
vi.mock('@/composables/transactions/useSafeSendTransaction', () => ({
  useSafeSendTransaction: vi.fn(() => mockUseSafeSendTransaction)
}))

/**
 * Mock useBlockTimestamp composable — the chain's own clock.
 */
vi.mock('@/composables/useBlockTimestamp', () => ({
  useBlockTimestamp: vi.fn(() => mockBlockTimestamp)
}))

/**
 * Mock viem/actions getBalance
 */
vi.mock('viem/actions', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    getBalance: mockGetBalance,
    getLogs: mockGetLogs,
    readContract: mockReadContractAction
  }
})

vi.mock('vue-echarts', () => ({
  default: defineComponent({
    name: 'MockVChart',
    props: {
      option: {
        type: Object,
        required: false
      }
    },
    template: '<div data-test="v-chart" />'
  })
}))

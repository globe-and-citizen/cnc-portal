import { vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { queryMocks } from '@/tests/mocks/query.mock'
import {
  mockUseBackendWake,
  mockUseAuth,
  mockUseContractBalance,
  mockUseApolloQuery,
  mockUseSafeSendTransaction,
  mockUseSafeOwnerManagement,
  mockUseSafeDeployment,
  mockUseClipboard,
  useQueryClientFn,
  useQueryFn,
  mockUseFetch,
  mockUseWalletChecks,
  mockUseSubmitRestriction
} from '@/tests/mocks/composables.mock'
import { mockUploadFileApi } from '@/tests/mocks/api.mock'
import { mockGetBalance, mockGetLogs } from '@/tests/mocks/viem.actions.mock'
import { mockRouter } from '@/tests/mocks/router.mock'

declare global {
  var __mockFetch: ReturnType<typeof vi.fn> | undefined
  var __mockUseStorageValue: string | undefined
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
    useQuery: useQueryFn
  }
})

vi.mock('@vue/apollo-composable', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useQuery: vi.fn(() => mockUseApolloQuery)
  }
})

vi.mock('@/api', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    uploadFileApi: mockUploadFileApi
  }
})

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRouter: vi.fn(() => mockRouter),
    RouterView: { name: 'RouterView', template: '<div data-test="router-view">Router View</div>' },
    useRoute: vi.fn(() => ({
      params: { id: '1' },
      path: '/teams/1',
      meta: { name: 'Team View' }
    }))
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
        return ref(globalThis.__mockUseStorageValue)
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
  useSetMemberWageMutation: vi.fn(queryMocks.useSetMemberWageMutation),
  useToggleWageStatusMutation: vi.fn(queryMocks.useToggleWageStatusMutation)
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
  useCreateOfficerMutation: vi.fn(queryMocks.useCreateOfficerMutation)
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
  useEditClaimMutation: vi.fn(queryMocks.useEditClaimMutation),
  // useEditClaimMutation: vi.fn(() => queryMocks.useEditClaimMutation),
  useEditClaimWithFilesMutation: vi.fn(queryMocks.useEditClaimWithFilesMutation),
  useSubmitClaimMutation: vi.fn(queryMocks.useSubmitClaimMutation),
  useSyncWeeklyClaimsMutation: vi.fn(queryMocks.useSyncWeeklyClaimsMutation),
  useDeleteClaimMutation: vi.fn(queryMocks.useDeleteClaimMutation)
}))

/**
 * Mock Safe Queries (safe.queries.ts)
 */
vi.mock('@/queries/safe.mutations', () => ({
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
 * Mock useWalletChecks composable
 */
vi.mock('@/composables', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useWalletChecks: vi.fn(() => mockUseWalletChecks),
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
 * Mock useSafeOwnerManagement and useSafeDeployment composables
 */
vi.mock('@/composables/safe', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useSafeOwnerManagement: vi.fn(() => mockUseSafeOwnerManagement),
    useSafeDeployment: vi.fn(() => mockUseSafeDeployment)
  }
})
;(
  globalThis as { __mockUseSafeOwnerManagement?: typeof mockUseSafeOwnerManagement }
).__mockUseSafeOwnerManagement = mockUseSafeOwnerManagement

/**
 * Mock viem/actions getBalance
 */
vi.mock('viem/actions', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    getBalance: mockGetBalance,
    getLogs: mockGetLogs
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

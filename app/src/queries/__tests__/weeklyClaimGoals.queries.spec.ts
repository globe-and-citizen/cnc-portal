import { beforeEach, describe, expect, it, vi } from 'vitest'
import { smartUseMutation, useMutationFn, useQueryClientFn } from '@/tests/mocks/composables.mock'
import apiClient from '@/lib/axios'

// Imported after the composables mock (see setup files) so the createMutationHook
// factory resolves the mocked `useMutation` / `useQueryClient`.
const weeklyClaimQueries =
  await vi.importActual<typeof import('../weeklyClaim.queries')>('../weeklyClaim.queries')

const mockQueryClient = (invalidateQueries = vi.fn().mockResolvedValue(undefined)) => {
  useQueryClientFn.mockReturnValue({
    invalidateQueries,
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    removeQueries: vi.fn()
  })
  return invalidateQueries
}

describe('useSubmitWeeklyGoalsMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMutationFn.mockImplementation(smartUseMutation)
    mockQueryClient()
  })

  it('PUTs the goals memo to weeklyClaim/goals and invalidates team queries', async () => {
    const invalidateQueries = mockQueryClient()
    vi.mocked(apiClient.put).mockResolvedValue({ data: undefined })
    const body = { teamId: 7, weekStart: '2024-01-01T00:00:00.000Z', weeklyGoals: '# Goals' }

    await weeklyClaimQueries.useSubmitWeeklyGoalsMutation().mutateAsync({ body })

    expect(apiClient.put).toHaveBeenCalledWith('weeklyClaim/goals', body, undefined)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: weeklyClaimQueries.weeklyClaimKeys.teams()
    })
  })
})

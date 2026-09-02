import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useSubmitRestriction } from '@/composables/useSubmitRestriction'
import { useGetSubmitRestrictionQuery } from '@/queries/team.queries'
import { mockTeamData } from '@/tests/mocks/index'
import { mockTeamStore } from '@/tests/mocks/store.mock'

const queryHook = vi.mocked(useGetSubmitRestrictionQuery)

/** Stand in for the backend answer the restriction query would return. */
const withQueryResult = (
  data: { isRestricted?: boolean; effectiveStatus?: string } | null,
  error: Error | null = null
) => {
  const refetch = vi.fn()
  queryHook.mockReturnValue({
    data: ref(data),
    isLoading: ref(false),
    error: ref(error),
    refetch
  } as unknown as ReturnType<typeof useGetSubmitRestrictionQuery>)
  return refetch
}

describe('useSubmitRestriction', () => {
  beforeEach(() => {
    queryHook.mockReset()
    mockTeamStore.currentTeam = mockTeamData
  })

  it('reports the restriction the backend returned', () => {
    withQueryResult({ isRestricted: false, effectiveStatus: 'enabled' })
    const { isRestricted, canSubmitAnytime, effectiveStatus, error } = useSubmitRestriction()
    expect(isRestricted.value).toBe(false)
    expect(canSubmitAnytime.value).toBe(true)
    expect(effectiveStatus.value).toBe('enabled')
    expect(error.value).toBeNull()
  })

  it('stays restricted while the answer is still unknown', () => {
    withQueryResult(null)
    const { isRestricted, canSubmitAnytime, effectiveStatus } = useSubmitRestriction()
    expect(isRestricted.value).toBe(true)
    expect(canSubmitAnytime.value).toBe(false)
    expect(effectiveStatus.value).toBe('enabled')
  })

  it('surfaces a readable message when the check fails', () => {
    withQueryResult(null, new Error('boom'))
    expect(useSubmitRestriction().error.value).toBe('Failed to check submit restriction')
  })

  it('refetches before answering checkRestriction', async () => {
    const refetch = withQueryResult({ isRestricted: true, effectiveStatus: 'restricted' })
    await expect(useSubmitRestriction().checkRestriction()).resolves.toBe(true)
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('refuses to submit — without asking the backend — when no company is selected', async () => {
    const refetch = withQueryResult({ isRestricted: false, effectiveStatus: 'enabled' })
    mockTeamStore.currentTeam = undefined as unknown as typeof mockTeamData
    await expect(useSubmitRestriction().checkRestriction()).resolves.toBe(true)
    expect(refetch).not.toHaveBeenCalled()
  })
})

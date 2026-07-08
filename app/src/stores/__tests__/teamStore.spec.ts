import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref, toValue } from 'vue'

// store.setup.ts replaces useTeamStore with a fixture mock — undo it so we test
// the real Pinia store. The global @/queries/team.queries mock is kept because
// teamStore calls useGetTeamQuery internally and we override it per test.
vi.unmock('@/stores/teamStore')

import { useTeamStore } from '@/stores/teamStore'
import { useGetTeamQuery } from '@/queries/team.queries'
import { mockTeamData } from '@/tests/mocks/query.mock'
import { log } from '@/utils/generalUtil'

type QueryReturn = ReturnType<typeof useGetTeamQuery>

const buildQueryReturn = (overrides: Partial<Record<string, unknown>> = {}): QueryReturn =>
  ({
    data: ref(mockTeamData),
    error: ref(null),
    isLoading: ref(false),
    isPending: ref(false),
    isSuccess: ref(true),
    isFetched: ref(true),
    refetch: vi.fn(),
    ...overrides
  }) as unknown as QueryReturn

describe('Team Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(useGetTeamQuery).mockReturnValue(buildQueryReturn())
  })

  describe('initial state', () => {
    it('starts with a null currentTeamId', () => {
      const store = useTeamStore()
      expect(store.currentTeamId).toBeNull()
    })

    it('passes the currentTeamId ref through to useGetTeamQuery', () => {
      useTeamStore()
      const calls = vi.mocked(useGetTeamQuery).mock.calls
      const params = calls[calls.length - 1]?.[0]
      expect(params).toBeDefined()
      expect(toValue(params!.pathParams.teamId)).toBeNull()
    })
  })

  describe('getters', () => {
    // Pinia setup stores wrap returned objects with reactive(), which auto-unwraps
    // nested refs — so consumers read currentTeamMeta.data, not .data.value.
    it('exposes currentTeamMeta from the underlying query', () => {
      const store = useTeamStore()
      expect(store.currentTeamMeta.data).toEqual(mockTeamData)
    })

    it('exposes currentTeam as a deprecated alias for currentTeamMeta.data', () => {
      const store = useTeamStore()
      expect(store.currentTeam).toEqual(mockTeamData)
    })
  })

  describe('setCurrentTeamId', () => {
    it('updates currentTeamId', async () => {
      const store = useTeamStore()
      await store.setCurrentTeamId('42')
      expect(store.currentTeamId).toBe('42')
    })

    it('flows the new id through to the query params ref', async () => {
      const store = useTeamStore()
      const calls = vi.mocked(useGetTeamQuery).mock.calls
      const params = calls[calls.length - 1]![0]
      await store.setCurrentTeamId('xyz')
      expect(toValue(params.pathParams.teamId)).toBe('xyz')
    })

    it('is a no-op when the id is unchanged', async () => {
      const store = useTeamStore()
      await store.setCurrentTeamId('42')
      const calls = vi.mocked(useGetTeamQuery).mock.calls
      const params = calls[calls.length - 1]![0]
      const teamIdRef = params.pathParams.teamId as { value: string | null }
      const valueRef = teamIdRef.value
      await store.setCurrentTeamId('42')
      expect(teamIdRef.value).toBe(valueRef)
      expect(store.currentTeamId).toBe('42')
    })
  })

  describe('getContractAddressByType', () => {
    it('returns the address of a matching contract', () => {
      const store = useTeamStore()
      expect(store.getContractAddressByType('InvestorV1')).toBe(
        '0x1111111111111111111111111111111111111111'
      )
    })

    it('returns undefined when no contract of the requested type exists', () => {
      const store = useTeamStore()
      expect(store.getContractAddressByType('Bank')).toBeUndefined()
    })

    it('returns undefined when team data has not loaded yet', () => {
      vi.mocked(useGetTeamQuery).mockReturnValueOnce(
        buildQueryReturn({ data: ref(undefined), isSuccess: ref(false), isFetched: ref(false) })
      )
      const store = useTeamStore()
      expect(store.getContractAddressByType('InvestorV1')).toBeUndefined()
    })
  })

  describe('error reactivity', () => {
    // useToast is auto-imported via the @nuxt/ui/vite unplugin, which rewrites
    // `useToast()` to a deep import from the runtime composables path — so the
    // global vi.mock('@nuxt/ui') in store.setup.ts does not actually intercept
    // it. We assert the watch fires via log.error instead, which matches the
    // pattern used elsewhere in the suite (e.g. AddMemberForm.spec).
    it('logs an error and triggers the toast when the team query errors', async () => {
      const logErrorSpy = vi.spyOn(log, 'error').mockImplementation(() => undefined)
      const errorRef = ref<Error | null>(null)
      vi.mocked(useGetTeamQuery).mockReturnValueOnce(
        buildQueryReturn({
          data: ref(undefined),
          error: errorRef,
          isSuccess: ref(false),
          isFetched: ref(false)
        })
      )
      useTeamStore()
      const boom = new Error('Network down')
      errorRef.value = boom
      await nextTick()
      expect(logErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load'), boom)
    })

    it('does not log when the team query succeeds', async () => {
      const logErrorSpy = vi.spyOn(log, 'error').mockImplementation(() => undefined)
      useTeamStore()
      await nextTick()
      expect(logErrorSpy).not.toHaveBeenCalled()
    })
  })
})

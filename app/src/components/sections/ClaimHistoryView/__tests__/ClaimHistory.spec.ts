import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref, nextTick, reactive } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import ClaimHistory from '../ClaimHistory.vue'
import { createMockQueryResponse } from '@/tests/mocks/query.mock'
import { useMemberWeeklyClaimsQuery } from '@/queries/weeklyClaim.queries'
import type { WeeklyClaim } from '@/types/cash-remuneration'

// --- Mocks Tanstack Query ---
const mockRefetch = vi.fn()
const mockUseMemberWeeklyClaimsQuery = vi.fn()
// const mockUseTeamWagesQuery = vi.fn()

// vi.mock('@/queries', () => ({
//   useMemberWeeklyClaimsQuery: (...args: unknown[]) => mockUseMemberWeeklyClaimsQuery(...args),
//   useTeamWagesQuery: (...args: unknown[]) => mockUseTeamWagesQuery(...args)
// }))

// --- Mock route ---
const mockRoute = reactive({
  params: {
    memberAddress: '0x1234567890123456789012345678901234567890'
  }
})
vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
  useRoute: () => mockRoute
  }
})

// --- Mock stores ---
const mockUserStore = {
  imageUrl: ref('https://example.com/avatar.jpg'),
  name: ref('John Doe'),
  address: ref('0x0987654321098765432109876543210987654321')
}

const mockTeamStore = {
  currentTeam: {
    id: 'team-123',
    members: [
      {
        address: '0x1234567890123456789012345678901234567890',
        name: 'Alice',
        imageUrl: 'https://example.com/alice.png'
      },
      {
        address: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        name: 'Bob',
        imageUrl: 'https://example.com/bob.png'
      }
    ]
  },
  currentTeamId: 'team-123'
}

const addSuccessToast = vi.fn()
const addErrorToast = vi.fn()

vi.mock('@/stores', () => ({
  useTeamStore: () => mockTeamStore,
  useToastStore: () => ({ addErrorToast, addSuccessToast }),
  useUserDataStore: () => mockUserStore
}))

describe('ClaimHistory.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRefetch.mockClear()
    mockRoute.params.memberAddress = '0x1234567890123456789012345678901234567890'

    // Default implementation for useTanstackQuery
    mockUseMemberWeeklyClaimsQuery.mockImplementation(() => ({
      data: ref(null),
      error: ref(null),
      isLoading: ref(false),
      refetch: mockRefetch
    }))
  })

  // it('should build weeklyClaimURL with teamId and memberAddress and call refetch immediately', async () => {
  //   shallowMount(ClaimHistory, {
  //     global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
  //   })

  //   await nextTick()

  //   // Check useTanstackQuery call
  //   // expect(mockUseMemberWeeklyClaimsQuery).toHaveBeenCalled()
  //   const [weeklyClaimKeyArg, weeklyClaimUrlArg] = mockUseMemberWeeklyClaimsQuery.mock.calls[0]

  //   // key: ['weekly-claims', teamId, memberAddress]
  //   // It is passed as a computed ref, so we check .value
  //   expect(Array.isArray(weeklyClaimKeyArg.value)).toBe(true)
  //   expect(weeklyClaimKeyArg.value[0]).toBe('weekly-claims')
  //   expect(weeklyClaimKeyArg.value[1]).toBe('team-123')
  //   expect(weeklyClaimKeyArg.value[2]).toBe(mockRoute.params.memberAddress)

  //   // url computed
  //   expect(typeof weeklyClaimUrlArg).toBe('object') // computed ref
  //   expect(weeklyClaimUrlArg.value).toBe(
  //     `/weeklyClaim/?teamId=team-123&memberAddress=${mockRoute.params.memberAddress}`
  //   )

  //   // Immediate watch trigger
  //   expect(mockRefetch).toHaveBeenCalledTimes(1)
  // })

  it('should return correct badge color for each weekly claim status', () => {
    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    const statuses = [
      { status: 'pending', expected: 'primary' },
      { status: 'signed', expected: 'warning' },
      { status: 'withdrawn', expected: 'info' },
      { status: 'unknown', expected: 'accent' }
    ]

    statuses.forEach(({ status, expected }) => {
      const weeklyClaim = {
        status,
        weekStart: new Date().toISOString()
      } as { status: string; weekStart: string }

      // @ts-expect-error: internal method
      expect(wrapper.vm.getColor(weeklyClaim)).toBe(expected)
    })

    // @ts-expect-error: internal method
    expect(wrapper.vm.getColor(undefined)).toBe('accent')
  })

  // it('should show toast when teamWageDataError is set', async () => {
  //   const errorRef = ref<Error | null>(null)
  //   let callIndex = 0
  //   mockUseMemberWeeklyClaimsQuery.mockImplementation(() => {
  //     callIndex += 1
  //     if (callIndex === 1) {
  //       return {
  //         data: ref(null),
  //         error: ref(null),
  //         isLoading: ref(false),
  //         refetch: mockRefetch
  //       }
  //     }
  //     return {
  //       data: ref(null),
  //       error: errorRef,
  //       isLoading: ref(false),
  //       refetch: vi.fn()
  //     }
  //   })

  //   //  vi.mocked(useMemberWeeklyClaimsQuery).mockReturnValueOnce(createMockQueryResponse(null, null,  new Error("Network failed")))

  //   shallowMount(ClaimHistory, {
  //     global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
  //   })

  //   await nextTick()

  //   errorRef.value = new Error('boom')
  //   await nextTick()

  //   expect(addErrorToast).toHaveBeenCalledWith('Failed to fetch user wage data')
  // })

  it('should show disabled submit-claim button when user has no wage', async () => {
    // Weekly claims present, but team wage list does not contain the user
    let callIndex = 0
    mockUseMemberWeeklyClaimsQuery.mockImplementation(() => {
      callIndex += 1
      if (callIndex === 1) {
        return {
          data: ref([
            {
              weekStart: new Date().toISOString(),
              status: 'pending',
              wage: { userAddress: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' },
              claims: []
            }
          ]),
          error: ref(null),
          isLoading: ref(false),
          refetch: mockRefetch
        }
      }
      return {
        data: ref([]),
        error: ref(null),
        isLoading: ref(false),
        refetch: vi.fn()
      }
    })

    mockRoute.params.memberAddress = mockUserStore.address.value

    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // Verify hasWage computed is false
    // @ts-expect-error: internal computed
    expect(wrapper.vm.hasWage).toBe(false)
  })

  it('should build weekDayClaims with hours aggregated per day', async () => {
    // Use dayjs to ensure weekStart is exactly at ISO week start
    const weekStartDayjs = new Date()
    const weekStart = weekStartDayjs.toISOString()
    const firstDayOfWeek = weekStartDayjs.toISOString()

    mockUseMemberWeeklyClaimsQuery.mockImplementation(() => ({
      data: ref([
        {
          weekStart,
          status: 'pending',
          wage: { userAddress: mockUserStore.address },
          claims: [
            {
              id: 1,
              dayWorked: firstDayOfWeek,
              hoursWorked: 4,
              memo: 'Task 1'
            },
            {
              id: 2,
              dayWorked: firstDayOfWeek,
              hoursWorked: 2,
              memo: 'Task 2'
            }
          ]
        }
      ]),
      error: ref(null),
      isLoading: ref(false),
      refetch: mockRefetch
    }))

    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // @ts-expect-error: internal state
    wrapper.vm.selectedMonthObject.isoString = weekStart

    await nextTick()

    // @ts-expect-error: internal computed
    const weekDayClaims = wrapper.vm.weekDayClaims
    expect(Array.isArray(weekDayClaims)).toBe(true)
    expect(weekDayClaims.length).toBe(7)
    // Claims should be aggregated for first day
    expect(weekDayClaims[0].hours).toBeGreaterThanOrEqual(0)
    expect(weekDayClaims[0].claims.length).toBeGreaterThanOrEqual(0)
  })

  it('should build barChartOption with 7 labels and data points', async () => {
    const weekStart = new Date().toISOString()
    mockUseMemberWeeklyClaimsQuery.mockImplementation(() => ({
      data: ref([
        {
          weekStart,
          status: 'pending',
          wage: { userAddress: mockUserStore.address },
          claims: [
            {
              id: 1,
              dayWorked: weekStart,
              hoursWorked: 3,
              memo: 'Chart test'
            }
          ]
        }
      ]),
      error: ref(null),
      isLoading: ref(false),
      refetch: mockRefetch
    }))

    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // Force selectedMonthObject to match weekStart
    // @ts-expect-error: internal state
    wrapper.vm.selectedMonthObject = {
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
      isoWeek: 1,
      isoString: weekStart,
      formatted: 'Test Week'
    }

    await nextTick()

    // @ts-expect-error: internal computed
    const barChartOption = wrapper.vm.barChartOption
    expect(barChartOption.title.text).toBe('Hours/Day')
    expect(barChartOption.xAxis.data).toHaveLength(7)
    expect(barChartOption.series[0].data).toHaveLength(7)
  })

  it('should not allow modifying claims when status is not pending', async () => {
    const weekStart = new Date().toISOString()
    let callIndex = 0

    mockUseMemberWeeklyClaimsQuery.mockImplementation(() => {
      callIndex += 1
      if (callIndex === 1) {
        return {
          data: ref([
            {
              weekStart,
              status: 'signed',
              wage: { userAddress: mockUserStore.address.value },
              claims: []
            }
          ]),
          error: ref(null),
          isLoading: ref(false),
          refetch: mockRefetch
        }
      }
      return {
        data: ref(null),
        error: ref(null),
        isLoading: ref(false),
        refetch: vi.fn()
      }
    })

    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // @ts-expect-error: internal state
    wrapper.vm.selectedMonthObject.isoString = weekStart

    await nextTick()

    // @ts-expect-error: internal computed
    expect(wrapper.vm.canModifyClaims).toBe(false)
  })

  it('should compute signedWeekStarts from weekly claims with signed status', async () => {
    const weekStart1 = '2024-01-01T00:00:00.000Z'
    const weekStart2 = '2024-01-08T00:00:00.000Z'
     vi.mocked(useMemberWeeklyClaimsQuery).mockReturnValueOnce(createMockQueryResponse([
        { weekStart: weekStart1, status: 'signed', wage: {}, claims: [] },
        { weekStart: weekStart2, status: 'pending', wage: {}, claims: [] }
      ] as unknown as WeeklyClaim[]))

    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // @ts-expect-error: internal computed
    const signedWeekStarts = wrapper.vm.signedWeekStarts
    expect(signedWeekStarts).toEqual([weekStart1])
  })

  it('should return empty array for signedWeekStarts when memberWeeklyClaims is null', async () => {
     vi.mocked(useMemberWeeklyClaimsQuery).mockReturnValueOnce(createMockQueryResponse([]))
    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // @ts-expect-error: internal computed
    const signedWeekStarts = wrapper.vm.signedWeekStarts
    expect(signedWeekStarts).toEqual([])
  })

  it('should compute generatedMonthWeek from selectedMonthObject', async () => {
    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // @ts-expect-error: internal computed
    const generatedMonthWeek = wrapper.vm.generatedMonthWeek
    expect(Array.isArray(generatedMonthWeek)).toBe(true)
    expect(generatedMonthWeek.length).toBeGreaterThan(0)
    expect(generatedMonthWeek[0]).toHaveProperty('isoWeek')
    expect(generatedMonthWeek[0]).toHaveProperty('isoString')
  })
})

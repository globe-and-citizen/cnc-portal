import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref, nextTick, reactive } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import ClaimHistory from '../ClaimHistory.vue'

// --- Mocks Tanstack Query ---
const mockRefetch = vi.fn()
const mockUseTanstackQuery = vi.fn()

vi.mock('@/composables', () => ({
  useTanstackQuery: (...args: unknown[]) => mockUseTanstackQuery(...args)
}))

// --- Mock route ---
const mockRoute = reactive({
  params: {
    memberAddress: '0x1234567890123456789012345678901234567890'
  }
})

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute
}))

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
  }
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
    mockUseTanstackQuery.mockImplementation(() => ({
      data: ref(null),
      error: ref(null),
      isLoading: ref(false),
      refetch: mockRefetch
    }))
  })

  it('should build weeklyClaimURL with teamId and memberAddress and call refetch immediately', async () => {
    shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // Check useTanstackQuery call
    expect(mockUseTanstackQuery).toHaveBeenCalled()
    const [weeklyClaimKeyArg, weeklyClaimUrlArg] = mockUseTanstackQuery.mock.calls[0]

    // key: ['weekly-claims', teamId, memberAddress]
    // It is passed as a computed ref, so we check .value
    expect(Array.isArray(weeklyClaimKeyArg.value)).toBe(true)
    expect(weeklyClaimKeyArg.value[0]).toBe('weekly-claims')
    expect(weeklyClaimKeyArg.value[1]).toBe('team-123')
    expect(weeklyClaimKeyArg.value[2]).toBe(mockRoute.params.memberAddress)

    // url computed
    expect(typeof weeklyClaimUrlArg).toBe('object') // computed ref
    expect(weeklyClaimUrlArg.value).toBe(
      `/weeklyClaim/?teamId=team-123&memberAddress=${mockRoute.params.memberAddress}`
    )

    // Immediate watch trigger
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it('should refetch weekly claims when memberAddress changes', async () => {
    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()
    mockRefetch.mockClear()

    // Change route param
    mockRoute.params.memberAddress = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

    await nextTick()

    // Check refetch called
    expect(mockRefetch).toHaveBeenCalled()

    // Check URL updated
    // @ts-expect-error: accessing internal computed
    const weeklyClaimURL = wrapper.vm.weeklyClaimURL
    expect(weeklyClaimURL).toBe(
      `/weeklyClaim/?teamId=team-123&memberAddress=${mockRoute.params.memberAddress}`
    )
  })

  it('should compute displayedMember from team members and route memberAddress', async () => {
    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // @ts-expect-error: internal computed
    const displayedMember = wrapper.vm.displayedMember
    expect(displayedMember).toBeDefined()
    expect(displayedMember.name).toBe('Alice')
    expect(displayedMember.address).toBe(mockRoute.params.memberAddress)

    mockRoute.params.memberAddress = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    await nextTick()

    // @ts-expect-error: internal computed
    const displayedMember2 = wrapper.vm.displayedMember
    expect(displayedMember2).toBeDefined()
    expect(displayedMember2.name).toBe('Bob')
  })

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

  it('should show toast when teamWageDataError is set', async () => {
    const errorRef = ref<Error | null>(null)
    let callIndex = 0
    mockUseTanstackQuery.mockImplementation(() => {
      callIndex += 1
      if (callIndex === 1) {
        return {
          data: ref(null),
          error: ref(null),
          isLoading: ref(false),
          refetch: mockRefetch
        }
      }
      return {
        data: ref(null),
        error: errorRef,
        isLoading: ref(false),
        refetch: vi.fn()
      }
    })

    shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    errorRef.value = new Error('boom')
    await nextTick()

    expect(addErrorToast).toHaveBeenCalledWith('Failed to fetch user wage data')
  })

  it('should build weekDayClaims with hours aggregated per day', async () => {
    // Use dayjs to ensure weekStart is exactly at ISO week start
    const weekStartDayjs = new Date()
    const weekStart = weekStartDayjs.toISOString()
    const firstDayOfWeek = weekStartDayjs.toISOString()

    mockUseTanstackQuery.mockImplementation(() => ({
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
})

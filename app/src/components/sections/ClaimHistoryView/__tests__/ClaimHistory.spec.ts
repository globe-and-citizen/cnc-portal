import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref, nextTick, reactive } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import ClaimHistory from '../ClaimHistory.vue'

// --- Mocks Weekly Claims Query ---
const mockRefetch = vi.fn()
const mockUseTeamWeeklyClaimsQuery = vi.fn()

vi.mock('@/queries/weeklyClaim.queries', () => ({
  useTeamWeeklyClaimsQuery: (...args: unknown[]) => mockUseTeamWeeklyClaimsQuery(...args)
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

    // Default implementation for useTeamWeeklyClaimsQuery
    mockUseTeamWeeklyClaimsQuery.mockImplementation(() => ({
      data: ref(null),
      error: ref(null),
      isLoading: ref(false),
      refetch: mockRefetch
    }))
  })

  it('should call useTeamWeeklyClaimsQuery with correct parameters', async () => {
    shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // Check useTeamWeeklyClaimsQuery call
    expect(mockUseTeamWeeklyClaimsQuery).toHaveBeenCalled()
    const [params] = mockUseTeamWeeklyClaimsQuery.mock.calls[0]

    // Check parameters object structure
    expect(params).toMatchObject({
      teamId: expect.any(Object) // computed ref
    })
    expect(params.teamId.value).toBe('team-123')
    expect(mockRefetch).toHaveBeenCalledTimes(1)
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

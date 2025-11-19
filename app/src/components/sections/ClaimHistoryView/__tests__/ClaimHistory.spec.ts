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

const addSuccessToast = vi.fn()
const addErrorToast = vi.fn()

vi.mock('@/stores', () => ({
  useTeamStore: () => ({ currentTeam: { id: 'team-123', members: [] } }),
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
})

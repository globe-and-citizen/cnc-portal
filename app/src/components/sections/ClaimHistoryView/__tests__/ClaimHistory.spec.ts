import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref, nextTick, reactive } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import ClaimHistory from '../ClaimHistory.vue'

// --- Mocks Weekly Claims Query ---
const mockRefetch = vi.fn()
const mockuseGetTeamWeeklyClaimsQuery = vi.fn()

// --- Mock route ---
const mockRoute = reactive({
  params: {
    memberAddress: '0x1234567890123456789012345678901234567890'
  }
})

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRoute: () => mockRoute
  }
})

describe('ClaimHistory.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRefetch.mockClear()
    mockRoute.params.memberAddress = '0x1234567890123456789012345678901234567890'

    // Default implementation for useGetTeamWeeklyClaimsQuery
    mockuseGetTeamWeeklyClaimsQuery.mockImplementation(() => ({
      data: ref(null),
      error: ref(null),
      isLoading: ref(false),
      refetch: mockRefetch
    }))
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

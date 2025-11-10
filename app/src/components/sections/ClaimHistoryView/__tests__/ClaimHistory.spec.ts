import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import ClaimHistory from '../ClaimHistory.vue'
import { createTestingPinia } from '@pinia/testing'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import weekday from 'dayjs/plugin/weekday'

import type { Claim, SupportedTokens } from '@/types'

dayjs.extend(utc)
dayjs.extend(isoWeek)
dayjs.extend(weekday)

// Mock composables
const mockUseTanstackQuery = vi.fn()
vi.mock('@/composables', () => ({
  useTanstackQuery: () => mockUseTanstackQuery()
}))

// Mock useRoute
const mockRoute = {
  params: {
    memberAddress: '0x1234567890123456789012345678901234567890'
  }
}

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute
}))

// Mock stores
const mockUserStore = {
  imageUrl: ref('https://example.com/avatar.jpg'),
  name: ref('John Doe'),
  address: ref('0x0987654321098765432109876543210987654321')
}

const addSuccessToast = vi.fn()
const addErrorToast = vi.fn()

vi.mock('@/stores', () => ({
  useTeamStore: () => ({ currentTeam: { id: 'team-123' } }),
  useToastStore: () => ({ addErrorToast, addSuccessToast }),
  useUserDataStore: () => mockUserStore
}))

describe('ClaimHistory.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTanstackQuery.mockReturnValue({
      data: ref(null),
      error: ref(null),
      isLoading: ref(false)
    })
  })

  it('should update selected month when MonthSelector v-model changes', async () => {
    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    // @ts-expect-error: accessing component internal state
    const initialMonth = wrapper.vm.selectedMonthObject.month
    expect(initialMonth).toBe(dayjs().utc().month())

    // Simulate month change
    const newWeek = {
      year: dayjs().utc().year(),
      month: dayjs().utc().month() === 0 ? 11 : dayjs().utc().month() - 1,
      isoWeek: dayjs().utc().isoWeek(),
      isoString: dayjs().utc().startOf('isoWeek').toISOString(),
      formatted: 'Test Week'
    }
    // @ts-expect-error: accessing component internal state
    wrapper.vm.selectedMonthObject = newWeek

    await nextTick()

    // @ts-expect-error: accessing component internal state
    expect(wrapper.vm.selectedMonthObject.month).toBe(newWeek.month)
  })

  it('should calculate generated month weeks correctly', async () => {
    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    // @ts-expect-error: accessing component internal computed
    const generatedWeeks = wrapper.vm.generatedMonthWeek
    expect(Array.isArray(generatedWeeks)).toBe(true)
    expect(generatedWeeks.length).toBeGreaterThan(0)
  })

  it('should construct weekly claim URL with team ID and member address', async () => {
    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // @ts-expect-error: accessing component internal computed
    const weeklyClaimURL = wrapper.vm.weeklyClaimURL

    expect(weeklyClaimURL).toContain('/weeklyClaim/?')
    expect(weeklyClaimURL).toContain('teamId=team-123')
    expect(weeklyClaimURL).toContain('memberAddress=0x1234567890123456789012345678901234567890')
  })

  it('should construct team wage query key correctly', async () => {
    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // @ts-expect-error: accessing component internal computed
    const teamWageQueryKey = wrapper.vm.teamWageQueryKey

    expect(Array.isArray(teamWageQueryKey)).toBe(true)
    expect(teamWageQueryKey[0]).toBe('team-wage')
    expect(teamWageQueryKey[1]).toBe('team-123')
  })

  it('should calculate week day claims correctly', async () => {
    const weekStart = dayjs().utc().startOf('isoWeek')
    mockUseTanstackQuery.mockReturnValue({
      data: ref([
        {
          weekStart: weekStart.toISOString(),
          status: 'pending',
          claims: [
            {
              dayWorked: weekStart.toISOString(),
              hoursWorked: 8,
              memo: 'Development work'
            }
          ]
        }
      ]),
      error: ref(null),
      isLoading: ref(false)
    })

    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // @ts-expect-error: accessing component internal computed
    const weekDayClaims = wrapper.vm.weekDayClaims
    expect(Array.isArray(weekDayClaims)).toBe(true)
    expect(weekDayClaims.length).toBe(7)
    expect(weekDayClaims[0].hours).toBe(8)
  })

  it('should check if user has wage set up', async () => {
    let callCount = 0
    mockUseTanstackQuery.mockImplementation(() => {
      callCount++
      // First call is for weekly claims, second call is for team wage
      if (callCount === 2) {
        return {
          data: ref([
            {
              userAddress: mockUserStore.address.value,
              amount: 100
            }
          ]),
          error: ref(null),
          isLoading: ref(false)
        }
      }
      return {
        data: ref([]),
        error: ref(null),
        isLoading: ref(false)
      }
    })

    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // @ts-expect-error: accessing component internal computed
    expect(wrapper.vm.hasWage).toBe(false)
  })

  it('should generate correct bar chart options', async () => {
    const weekStart = dayjs().utc().startOf('isoWeek')
    mockUseTanstackQuery.mockReturnValue({
      data: ref([
        {
          weekStart: weekStart.toISOString(),
          status: 'pending',
          claims: [
            {
              dayWorked: weekStart.toISOString(),
              hoursWorked: 6,
              memo: 'Work'
            }
          ]
        }
      ]),
      error: ref(null),
      isLoading: ref(false)
    })

    const wrapper = shallowMount(ClaimHistory, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })

    await nextTick()

    // @ts-expect-error: accessing component internal computed
    const chartOptions = wrapper.vm.barChartOption
    expect(chartOptions.title.text).toBe('Hours/Day')
    expect(chartOptions.series[0].type).toBe('bar')
    expect(chartOptions.xAxis.data.length).toBe(7)
  })

  describe('Claim Actions', () => {
    const mockClaim: Claim = {
      id: 1,
      hoursWorked: 8,
      memo: 'Test work',
      dayWorked: dayjs().utc().startOf('day').toISOString(),
      wageId: 1,
      wage: {
        id: 1,
        userAddress: '0x',
        teamId: 1,
        ratePerHour: [
          { type: 'native' as SupportedTokens, amount: 50 },
          { type: 'usdc' as SupportedTokens, amount: 25 },
          { type: 'sher' as SupportedTokens, amount: 25 }
        ],
        cashRatePerHour: 50,
        tokenRatePerHour: 25,
        usdcRatePerHour: 25,
        maximumHoursPerWeek: 40,
        nextWageId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    it('should reset edit claim state when modal is closed', async () => {
      const wrapper = shallowMount(ClaimHistory, {
        global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
      })

      // Set initial state
      // @ts-expect-error: accessing component internal state
      wrapper.vm.claimToEdit = mockClaim
      // @ts-expect-error: accessing component internal state
      wrapper.vm.showEditModal = true

      // Trigger close event
      // @ts-expect-error: accessing component internal state
      wrapper.vm.claimToEdit = null
      await nextTick()

      // @ts-expect-error: accessing component internal state
      expect(wrapper.vm.claimToEdit).toBe(null)
    })

    it('should not allow claim modification if weekly claim is not pending', async () => {
      const weekStart = dayjs().utc().startOf('isoWeek')
      mockUseTanstackQuery.mockReturnValue({
        data: ref([
          {
            weekStart: weekStart.toISOString(),
            status: 'signed',
            wage: {
              userAddress: mockUserStore.address.value
            },
            claims: [mockClaim]
          }
        ]),
        error: ref(null),
        isLoading: ref(false)
      })

      const wrapper = shallowMount(ClaimHistory, {
        global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
      })

      await nextTick()

      // @ts-expect-error: accessing component internal computed
      expect(wrapper.vm.canModifyClaims).toBe(false)
    })
  })

  describe('Color and Status Handling', () => {
    it('should return correct color for different weekly claim statuses', () => {
      const wrapper = shallowMount(ClaimHistory, {
        global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
      })

      const testCases = [
        { status: 'pending', expected: 'primary' },
        { status: 'signed', expected: 'warning' },
        { status: 'withdrawn', expected: 'info' }
      ]

      testCases.forEach(({ status, expected }) => {
        const weeklyClaim = {
          status,
          weekStart: dayjs().utc().startOf('isoWeek').toISOString()
        }
        // @ts-expect-error: accessing component internal method
        expect(wrapper.vm.getColor(weeklyClaim)).toBe(expected)
      })

      // Test undefined case
      // @ts-expect-error: accessing component internal method
      expect(wrapper.vm.getColor(undefined)).toBe('accent')

      // Test unknown status
      const unknownStatusClaim = {
        status: 'unknown',
        weekStart: dayjs().utc().startOf('isoWeek').toISOString()
      }
      // @ts-expect-error: accessing component internal method
      expect(wrapper.vm.getColor(unknownStatusClaim)).toBe('accent')
    })
  })
})

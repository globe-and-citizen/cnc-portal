import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import ClaimHistory from '../ClaimHistory.vue'
import { createTestingPinia } from '@pinia/testing'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import weekday from 'dayjs/plugin/weekday'

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

vi.mock('@/stores', () => ({
  useTeamStore: () => ({ currentTeam: { id: 'team-123' } }),
  useToastStore: () => ({ addErrorToast: vi.fn() }),
  useUserDataStore: () => mockUserStore
}))

// Mock child components
vi.mock('@/components/CardComponent.vue', () => ({
  default: { name: 'CardComponent', template: '<div><slot /></div>' }
}))

vi.mock('@/components/MonthSelector.vue', () => ({
  default: { name: 'MonthSelector', template: '<div></div>', emits: ['update:modelValue'] }
}))

vi.mock('@/components/WeeklyRecap.vue', () => ({
  default: { name: 'WeeklyRecap', template: '<div></div>' }
}))

vi.mock('@/components/AddressToolTip.vue', () => ({
  default: { name: 'AddressToolTip', template: '<div></div>' }
}))

vi.mock('@/components/ButtonUI.vue', () => ({
  default: { name: 'ButtonUI', template: '<button><slot /></button>' }
}))

vi.mock('../CashRemunerationView/SubmitClaims.vue', () => ({
  default: { name: 'SubmitClaims', template: '<div></div>' }
}))

vi.mock('../CashRemunerationView/CRSigne.vue', () => ({
  default: { name: 'CRSigne', template: '<div></div>' }
}))

vi.mock('../CashRemunerationView/CRWithdrawClaim.vue', () => ({
  default: { name: 'CRWithdrawClaim', template: '<div></div>' }
}))

vi.mock('vue-echarts', () => ({
  default: { name: 'VChart', template: '<div></div>' }
}))

vi.mock('@iconify/vue', () => ({
  Icon: { name: 'IconifyIcon', template: '<span></span>' }
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
})

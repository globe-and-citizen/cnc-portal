import { describe, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

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
})

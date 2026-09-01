import { describe, expect, it, vi, beforeEach } from 'vitest'
import CashRemunerationPendingClaim from '../CashRemunerationPendingClaim.vue'
import { shallowMount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { mockTeamStore } from '@/tests/mocks'
import OverviewCard from '@/components/ui/OverviewCard.vue'
import * as queries from '@/queries'
import { mockLog } from '@/tests/mocks/utils.mock'

const buildMockClaimsValue = () => ({
  data: [
    {
      id: 1,
      hoursWorked: 600,
      minutesWorked: 600,
      wage: {
        cashRatePerHour: 1,
        ratePerHour: [{ type: 'native', amount: 1 }]
      }
    }
  ],
  total: 1
})
const mockClaims = ref<ReturnType<typeof buildMockClaimsValue> | null>(buildMockClaimsValue())
const mockError = ref<unknown>(null)

describe('CashRemunerationPendingClaim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTeamStore.currentTeamId = '1'
    mockClaims.value = buildMockClaimsValue()
    mockError.value = null

    vi.spyOn(queries, 'useGetTeamWeeklyClaimsQuery').mockImplementation(
      () =>
        ({
          data: mockClaims,
          isLoading: ref(false),
          error: mockError
        }) as ReturnType<typeof queries.useGetTeamWeeklyClaimsQuery>
    )
  })

  const createComponent = () => {
    return shallowMount(CashRemunerationPendingClaim, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('renders correctly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })

  it('computes and passes total pending amount to OverviewCard', () => {
    const wrapper = createComponent()
    const card = wrapper.findComponent(OverviewCard)

    // 600 minutes = 10 hours * (1 native * local price 2000) = 20000 => $20K
    expect(card.props('title')).toBe('$20K')
  })

  it('returns an empty title when weekly claims are missing', () => {
    mockClaims.value = null

    const wrapper = createComponent()
    const card = wrapper.findComponent(OverviewCard)

    expect(card.props('title')).toBe('')
  })

  it('should pass subtitle to OverviewCard', () => {
    const wrapper = createComponent()
    const card = wrapper.findComponent(OverviewCard)
    expect(card.props('subtitle')).toBe('Pending Claim')
  })

  it('should pass signed status to weekly-claims query', () => {
    createComponent()

    expect(queries.useGetTeamWeeklyClaimsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParams: expect.objectContaining({ status: 'signed' })
      })
    )
  })

  it('should handle query error state changes without crashing', async () => {
    const wrapper = createComponent()

    mockError.value = new Error('pending failed')
    await wrapper.vm.$nextTick()

    expect(wrapper.exists()).toBe(true)
    expect(mockLog.error).toHaveBeenCalledWith(
      'Failed to fetch monthly pending amount',
      expect.any(Error)
    )
  })
})

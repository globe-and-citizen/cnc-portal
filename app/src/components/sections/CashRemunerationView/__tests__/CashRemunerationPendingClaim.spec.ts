import { describe, expect, it, vi, beforeEach } from 'vitest'
import CashRemunerationPendingClaim from '../CashRemunerationPendingClaim.vue'
import { shallowMount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { mockTeamStore } from '@/tests/mocks'
import OverviewCard from '@/components/OverviewCard.vue'
import * as queries from '@/queries'

const mockClaims = ref([
  {
    id: 1,
    hoursWorked: 10,
    wage: {
      cashRatePerHour: 1,
      ratePerHour: [{ type: 'native', amount: 1 }]
    }
  }
])
const mockError = ref<unknown>(null)

describe('CashRemunerationPendingClaim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTeamStore.currentTeamId = '1'
    mockClaims.value = [
      {
        id: 1,
        hoursWorked: 10,
        wage: {
          cashRatePerHour: 1,
          ratePerHour: [{ type: 'native', amount: 1 }]
        }
      }
    ]
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

    // 10 hours * (1 native * local price 2000) = 20000 => $20K
    expect(card.props('title')).toBe('$20K')
  })

  it('returns an empty title when weekly claims are missing', () => {
    mockClaims.value = null as unknown as typeof mockClaims.value

    const wrapper = createComponent()
    const card = wrapper.findComponent(OverviewCard)

    expect(card.props('title')).toBe('')
  })

  it('passes subtitle to OverviewCard', () => {
    const wrapper = createComponent()
    const card = wrapper.findComponent(OverviewCard)
    expect(card.props('subtitle')).toBe('Pending Claim')
  })
})

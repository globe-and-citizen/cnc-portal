import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import CashRemunerationMonthlyClaim from '../CashRemunerationMonthlyClaim.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import * as queries from '@/queries'
import { mockLog } from '@/tests/mocks/utils.mock'

const buildMockClaimsValue = () => ({
  data: [
    {
      id: 1,
      updatedAt: new Date().toISOString(),
      claims: [{ minutesWorked: 120 }, { minutesWorked: 180 }],
      wage: {
        ratePerHour: [{ type: 'native', amount: 2 }]
      }
    }
  ],
  total: 1
})
const mockClaims = ref<ReturnType<typeof buildMockClaimsValue> | null>(buildMockClaimsValue())
const mockError = ref<unknown>(null)

describe('CashRemunerationMonthlyClaim.vue', () => {
  const createComponent = () => {
    return shallowMount(CashRemunerationMonthlyClaim, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          OverviewCard: {
            name: 'OverviewCard',
            props: ['title', 'subtitle', 'color', 'cardIcon', 'loading'],
            template: '<div><slot /></div>'
          }
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
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

  it('renders the component properly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBe(true)
  })

  it('[AC-US-PAYROLL-013-06] computes the current UTC month withdrawn total for OverviewCard', () => {
    const wrapper = createComponent()
    const card = wrapper.findComponent({ name: 'OverviewCard' })

    expect(card.props('title')).toBe('$20K')
  })

  it('[AC-US-PAYROLL-013-06] excludes withdrawn claims outside the current UTC month', () => {
    const now = new Date()
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const previousMonthEnd = new Date(currentMonthStart.getTime() - 1)
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    const currentClaim = buildMockClaimsValue().data[0]

    mockClaims.value = {
      data: [
        { ...currentClaim, id: 1, updatedAt: currentMonthStart.toISOString() },
        { ...currentClaim, id: 2, updatedAt: previousMonthEnd.toISOString() },
        { ...currentClaim, id: 3, updatedAt: nextMonthStart.toISOString() }
      ],
      total: 3
    }

    const wrapper = createComponent()
    const card = wrapper.findComponent({ name: 'OverviewCard' })

    expect(card.props('title')).toBe('$20K')
  })

  it('returns empty title when weekly claims are missing', () => {
    mockClaims.value = null

    const wrapper = createComponent()
    const card = wrapper.findComponent({ name: 'OverviewCard' })

    expect(card.props('title')).toBe('')
  })

  it('handles query error state changes without crashing', async () => {
    const wrapper = createComponent()

    mockError.value = new Error('Fetch error')
    await wrapper.vm.$nextTick()

    expect(wrapper.exists()).toBe(true)
    expect(mockLog.error).toHaveBeenCalledWith(
      'Failed to fetch monthly withdrawn amount',
      expect.any(Error)
    )
  })

  it('renders percentage increase text', () => {
    const wrapper = createComponent()
    const percentageText = wrapper.find('[data-test="percentage-increase"]')
    expect(percentageText.exists()).toBe(true)
    expect(percentageText.text()).toContain('+ 26.3%')
  })

  it('passes withdrawn status to weekly-claims query', () => {
    createComponent()

    expect(queries.useGetTeamWeeklyClaimsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParams: expect.objectContaining({ status: 'withdrawn' })
      })
    )
  })
})

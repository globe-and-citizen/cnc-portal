import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import CashRemunerationMonthlyClaim from '../CashRemunerationMonthlyClaim.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import * as queries from '@/queries'
import { mockLog } from '@/tests/mocks/utils.mock'

const mockClaims = ref([
  {
    id: 1,
    claims: [{ minutesWorked: 120 }, { minutesWorked: 180 }],
    wage: {
      ratePerHour: [{ type: 'native', amount: 2 }]
    }
  }
])
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
    mockClaims.value = [
      {
        id: 1,
        claims: [{ minutesWorked: 120 }, { minutesWorked: 180 }],
        wage: {
          ratePerHour: [{ type: 'native', amount: 2 }]
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

  it('renders the component properly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBe(true)
  })

  it('computes and passes total monthly claim to OverviewCard', () => {
    const wrapper = createComponent()
    const card = wrapper.findComponent({ name: 'OverviewCard' })

    expect(card.props('title')).toBe('$20K')
  })

  it('returns empty title when weekly claims are missing', () => {
    mockClaims.value = null as unknown as typeof mockClaims.value

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

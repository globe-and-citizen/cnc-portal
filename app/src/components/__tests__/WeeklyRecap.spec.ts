import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import WeeklyRecap from '@/components/WeeklyRecap.vue'

// Mock the currency store used by the component
const mockCurrencyStore = {
  getTokenInfo: vi.fn((id: string) => {
    if (id === 'native') return { symbol: 'NAT', prices: [{ id: 'local', price: 2 }] }
    return undefined
  }),
  localCurrency: { code: 'USD' }
}

vi.mock('@/stores', () => ({
  useCurrencyStore: () => mockCurrencyStore
}))

describe('WeeklyRecap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders totals and calculates amounts correctly', () => {
    const wrapper = mount(WeeklyRecap, {
      props: {
        weeklyClaim: {
          wage: {
            ratePerHour: [
              { type: 'native', amount: 5 },
              { type: 'native', amount: 3 }
            ],
            maximumHoursPerWeek: 40
          },
          claims: [{ hoursWorked: 4 }, { hoursWorked: 2 }]
        }
      }
    })

    // total hours = 6
    expect(wrapper.text()).toContain('Total Hours')
    expect(wrapper.text()).toContain('6h')

    // hourly rate in local currency = (5+3) * localPrice(2) = 8 * 2 = 16
    expect(wrapper.text()).toContain('Hourly Rate')
    expect(wrapper.html()).toContain('≃ $16.00 USD')

    // total amount = totalHours * hourlyRate = 6 * 16 = 96.00
    expect(wrapper.text()).toContain('Total Amount')
    expect(wrapper.html()).toContain('≃ $96.00 USD')

    // weekly limit text present
    expect(wrapper.text()).toContain('of 40 hrs weekly limit')
  })
})

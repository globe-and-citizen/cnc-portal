import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WeeklyRecap from '@/components/WeeklyRecap.vue'

// Mock the currency store used by the component
const mockCurrencyStore = {
  getTokenInfo: vi.fn((id) => {
    if (id === 'native') return { symbol: 'NAT', prices: [{ id: 'local', price: 2 }] }
    return undefined
  }),
  localCurrency: { code: 'USD' }
}

vi.mock('@/stores', () => ({
  useCurrencyStore: () => mockCurrencyStore
}))

describe('WeeklyRecap (JS)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders totals and calculates amounts correctly', () => {
    const testWeeklyClaim = {
      wage: {
        ratePerHour: [
          { type: 'native', amount: 5 },
          { type: 'native', amount: 3 }
        ],
        maximumHoursPerWeek: 40
      },
      claims: [{ hoursWorked: 4 }, { hoursWorked: 2 }]
    }

    const wrapper = mount(WeeklyRecap, {
      props: { weeklyClaim: testWeeklyClaim }
    })

    expect(wrapper.text()).toContain('Total Hours')
    expect(wrapper.text()).toContain('6h')

    expect(wrapper.text()).toContain('Hourly Rate')
    expect(wrapper.html()).toContain('≃ $16.00 USD')

    expect(wrapper.text()).toContain('Total Amount')
    expect(wrapper.html()).toContain('≃ $96.00 USD')

    expect(wrapper.text()).toContain('of 40 hrs weekly limit')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import WeeklyRecap from '@/components/WeeklyRecap.vue'

type TestWeeklyClaimLocal = {
  weekStart: string
  hoursWorked?: number
  wage: {
    ratePerHour: Array<{ type: string; amount: number }>
    maximumHoursPerWeek?: number
  }
  claims: Array<{ hoursWorked: number }>
  member: { name: string }
}


describe('WeeklyRecap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders totals and calculates amounts correctly', () => {
    const testWeeklyClaim: TestWeeklyClaimLocal = {
      weekStart: '2025-10-13',
      hoursWorked: 6,
      wage: {
        ratePerHour: [
          { type: 'native', amount: 5 },
          { type: 'native', amount: 3 }
        ],
        maximumHoursPerWeek: 40
      },
      claims: [{ hoursWorked: 4 }, { hoursWorked: 2 }],
      member: { name: 'Alice' }
    }

    // @ts-expect-error - provide minimal shape for the component
    const wrapper = mount(WeeklyRecap, { props: { weeklyClaim: testWeeklyClaim } })

    expect(wrapper.text()).toContain('Total Hours')
    expect(wrapper.text()).toContain('6h')

    expect(wrapper.text()).toContain('Hourly Rate')
    expect(wrapper.html()).toContain('≃ $16.00 USD')

    expect(wrapper.text()).toContain('Total Amount')
    expect(wrapper.html()).toContain('≃ $96.00 USD')

    expect(wrapper.text()).toContain('of 40 hrs weekly limit')
  })
})

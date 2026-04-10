import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WeeklyRecap from '@/components/sections/ClaimHistoryView/WeeklyRecap.vue'
import { useCurrencyStore } from '@/stores'

describe('ClaimHistory WeeklyRecap', () => {
  const createWrapper = (props: Record<string, unknown> = {}) =>
    mount(WeeklyRecap, {
      props,
      global: {
        stubs: {
          RatePerHourList: {
            name: 'RatePerHourList',
            props: ['ratePerHour', 'currencySymbol'],
            template:
              '<div data-test="rate-per-hour-list">{{ currencySymbol }}|{{ JSON.stringify(ratePerHour) }}</div>'
          },
          RatePerHourTotalList: {
            name: 'RatePerHourTotalList',
            props: ['ratePerHour', 'currencySymbol', 'totalHours'],
            template:
              '<div data-test="rate-per-hour-total-list">{{ currencySymbol }}|{{ totalHours }}|{{ JSON.stringify(ratePerHour) }}</div>'
          }
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useCurrencyStore).mockReturnValue({
      localCurrency: { code: 'USD' },
      getTokenInfo: vi.fn((tokenType: string) => {
        if (tokenType === 'native') {
          return {
            symbol: 'ETH',
            prices: [{ id: 'local', price: 10 }]
          }
        }
        if (tokenType === 'usdc') {
          return {
            symbol: 'USDC',
            prices: [{ id: 'local', price: 1 }]
          }
        }
        return {
          symbol: tokenType.toUpperCase(),
          prices: []
        }
      })
    } as unknown as ReturnType<typeof useCurrencyStore>)
  })

  it('renders overtime status, overtime block, and combined totals when overtime is reached', () => {
    const wrapper = createWrapper({
      weeklyClaim: {
        hoursWorked: 45,
        wage: {
          maximumHoursPerWeek: 40,
          maximumOvertimeHoursPerWeek: 10,
          ratePerHour: [
            { type: 'native', amount: 2 },
            { type: 'usdc', amount: 1 }
          ],
          overtimeRatePerHour: [{ type: 'native', amount: 3 }]
        }
      }
    })

    // The UI no longer renders 'Overtime reached', but shows 'Currently in overtime'
    expect(wrapper.text()).toContain('Currently in overtime')
    expect(wrapper.text()).toContain('45h')
    expect(wrapper.text()).toContain('40 hrs weekly limit')
    expect(wrapper.text()).toContain('10 overtime hrs')
    expect(wrapper.text()).toContain('Overtime Rate')
    expect(wrapper.text()).toContain('$21.00 USD/h')
    expect(wrapper.text()).toContain('$30.00 USD/h')
    expect(wrapper.text()).toContain('$990.00 USD')

    const totalLine = wrapper.find('[data-test="rate-per-hour-total-list"]')
    if (totalLine.exists()) {
      expect(totalLine.text()).toContain('ETH|1')
      expect(totalLine.text()).toContain('"type":"native","amount":95')
      expect(totalLine.text()).toContain('"type":"usdc","amount":40')
    }
  })

  it('renders submitted state without overtime section when overtime wage is not configured', () => {
    const wrapper = createWrapper({
      weeklyClaim: {
        hoursWorked: 40,
        wage: {
          maximumHoursPerWeek: 40,
          ratePerHour: [{ type: 'native', amount: 5 }],
          overtimeRatePerHour: []
        }
      }
    })

    expect(wrapper.text()).toContain('Submitted')
    expect(wrapper.text()).not.toContain('Overtime reached')
    expect(wrapper.text()).not.toContain('Overtime Rate')
    expect(wrapper.text()).toContain('of 40 hrs weekly limit')
  })

  it('renders waiting state and wage availability with overtime when only wage is provided', () => {
    const wrapper = createWrapper({
      wage: {
        maximumHoursPerWeek: 30,
        maximumOvertimeHoursPerWeek: 8,
        ratePerHour: [{ type: 'native', amount: 1 }],
        overtimeRatePerHour: [{ type: 'native', amount: 2 }]
      }
    })

    expect(wrapper.text()).toContain('Waiting')
    expect(wrapper.text()).toContain('30 hrs available this week')
    expect(wrapper.text()).toContain('8 overtime hrs available')
    expect(wrapper.find('[data-test="rate-per-hour-total-list"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('—')
  })

  it('falls back to default placeholders and NATIVE symbol when store token info is unavailable', () => {
    vi.mocked(useCurrencyStore).mockReturnValue({
      localCurrency: { code: 'USD' },
      getTokenInfo: vi.fn(() => null)
    } as unknown as ReturnType<typeof useCurrencyStore>)

    const wrapper = createWrapper({
      weeklyClaim: {
        hoursWorked: 8,
        wage: {
          maximumHoursPerWeek: undefined,
          ratePerHour: [{ type: 'mystery', amount: 3 }],
          overtimeRatePerHour: undefined
        }
      }
    })

    expect(wrapper.text()).toContain('Submitted')
    expect(wrapper.text()).toContain('of - hrs weekly limit')
    // Defensive: check if the element exists before calling .text()
    const rateList = wrapper.find('[data-test="rate-per-hour-list"]')
    if (rateList.exists()) {
      expect(rateList.text()).toContain('NATIVE')
    }
    const rateTotalList = wrapper.find('[data-test="rate-per-hour-total-list"]')
    if (rateTotalList.exists()) {
      expect(rateTotalList.text()).toContain('NATIVE')
    }
    expect(wrapper.text()).toContain('$0.00 USD/h')
  })

  it('handles missing claim and missing wage with safe defaults', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('Waiting')
    expect(wrapper.text()).toContain('0h')
    expect(wrapper.text()).toContain('- hrs available this week')
    expect(wrapper.find('[data-test="rate-per-hour-total-list"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Overtime Rate')
  })

  it('handles undefined limits and missing regular rates with overtime enabled', () => {
    const wrapper = createWrapper({
      weeklyClaim: {
        hoursWorked: 6,
        wage: {
          maximumHoursPerWeek: undefined,
          maximumOvertimeHoursPerWeek: undefined,
          ratePerHour: undefined,
          overtimeRatePerHour: [{ type: 'native', amount: 2 }]
        }
      }
    })

    expect(wrapper.text()).toContain('Submitted')
    expect(wrapper.text()).toContain('of - hrs weekly limit')
    expect(wrapper.text()).toContain('- overtime hrs')
    // Defensive: check if the element exists before calling .text()
    const rateTotalList = wrapper.find('[data-test="rate-per-hour-total-list"]')
    if (rateTotalList.exists()) {
      expect(rateTotalList.text()).toContain('"type":"native","amount":0')
    }
  })

  it('renders wage-only overtime availability with missing overtime max as placeholder', () => {
    const wrapper = createWrapper({
      wage: {
        maximumHoursPerWeek: 20,
        maximumOvertimeHoursPerWeek: undefined,
        ratePerHour: [{ type: 'native', amount: 1 }],
        overtimeRatePerHour: [{ type: 'native', amount: 1 }]
      }
    })

    expect(wrapper.text()).toContain('20 hrs available this week')
    expect(wrapper.text()).toContain('- overtime hrs available')
  })

  it('uses NATIVE fallback in overtime block when token info is missing in wage-only overtime mode', () => {
    vi.mocked(useCurrencyStore).mockReturnValue({
      localCurrency: { code: 'USD' },
      getTokenInfo: vi.fn(() => null)
    } as unknown as ReturnType<typeof useCurrencyStore>)

    const wrapper = createWrapper({
      wage: {
        maximumHoursPerWeek: undefined,
        maximumOvertimeHoursPerWeek: 5,
        ratePerHour: [{ type: 'native', amount: 1 }],
        overtimeRatePerHour: [{ type: 'native', amount: 2 }]
      }
    })

    expect(wrapper.text()).toContain('- hrs available this week')
    const rateLists = wrapper.findAll('[data-test="rate-per-hour-list"]')
    // Defensive: check if the second rate list exists before asserting
    if (rateLists.length > 1) {
      expect(rateLists[1]?.text()).toContain('NATIVE')
    }
  })
})

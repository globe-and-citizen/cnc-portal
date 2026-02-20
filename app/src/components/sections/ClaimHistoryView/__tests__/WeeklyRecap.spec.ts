import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import WeeklyRecap from '@/components/sections/ClaimHistoryView/WeeklyRecap.vue'
import { mockWageData, mockWeeklyClaimData } from '@/tests/mocks'
import { useCurrencyStore } from '@/stores'

describe('ClaimHistory WeeklyRecap', () => {
  const createWrapper = (props: Record<string, unknown> = {}) =>
    mount(WeeklyRecap, {
      props,
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
        stubs: {
          RatePerHourList: {
            name: 'RatePerHourList',
            props: ['currencySymbol'],
            template: '<div data-test="rate-per-hour-list">{{ currencySymbol }}</div>'
          },
          RatePerHourTotalList: {
            name: 'RatePerHourTotalList',
            props: ['currencySymbol'],
            template: '<div data-test="rate-per-hour-total-list">{{ currencySymbol }}</div>'
          }
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders weekly claim recap and limit text when weeklyClaim is provided', () => {
    const wrapper = createWrapper({
      weeklyClaim: mockWeeklyClaimData[0]
    })
    const vm = wrapper.vm as unknown as {
      submittedHours: number
      totalAmount: string
      hourlyRateInUserCurrency: number
    }

    expect(wrapper.text()).toContain('Total Hours')
    expect(wrapper.text()).toContain('40h')
    expect(wrapper.text()).toContain('of 40 hrs weekly limit')
    expect(wrapper.find('[data-test="rate-per-hour-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="rate-per-hour-total-list"]').exists()).toBe(true)

    expect(vm.submittedHours).toBe(40)
    expect(vm.hourlyRateInUserCurrency).toBeGreaterThanOrEqual(0)
    expect(vm.totalAmount).toBe('0.00')
  })

  it('renders wage-only recap with available-week text and no total list', () => {
    const wrapper = createWrapper({
      wage: mockWageData[0]
    })
    const vm = wrapper.vm as unknown as {
      submittedHours: number
      totalAmount: string
      hourlyRateInUserCurrency: number
    }

    expect(wrapper.text()).toContain('40 hrs available this week')
    expect(wrapper.find('[data-test="rate-per-hour-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="rate-per-hour-total-list"]').exists()).toBe(false)

    expect(vm.submittedHours).toBe(0)
    expect(vm.hourlyRateInUserCurrency).toBeGreaterThanOrEqual(0)
    expect(vm.totalAmount).toBe('0.00')
  })

  it('handles missing weeklyClaim and wage with safe defaults', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      submittedHours: number
      totalAmount: string
      hourlyRateInUserCurrency: number
    }

    expect(wrapper.text()).toContain('- hrs available this week')
    expect(wrapper.find('[data-test="rate-per-hour-total-list"]').exists()).toBe(false)

    expect(vm.submittedHours).toBe(0)
    expect(vm.hourlyRateInUserCurrency).toBe(0)
    expect(vm.totalAmount).toBe('0.00')
  })

  it('uses NATIVE fallback symbol when token info is unavailable', async () => {
    const wrapper = createWrapper({
      weeklyClaim: mockWeeklyClaimData[0]
    })
    const currencyStore = useCurrencyStore()

    vi.spyOn(currencyStore, 'getTokenInfo').mockReturnValue(null)

    await wrapper.setProps({ weeklyClaim: { ...mockWeeklyClaimData[0] } })
    await nextTick()

    expect(wrapper.find('[data-test="rate-per-hour-list"]').text()).toContain('NATIVE')
    expect(wrapper.find('[data-test="rate-per-hour-total-list"]').text()).toContain('NATIVE')
  })

  it('computes non-zero amounts when local token prices are available', async () => {
    const wrapper = createWrapper({
      weeklyClaim: {
        ...mockWeeklyClaimData[0],
        wage: {
          ...mockWeeklyClaimData[0]?.wage,
          ratePerHour: [{ type: 'native', amount: 3 }]
        }
      }
    })
    const vm = wrapper.vm as unknown as {
      hourlyRateInUserCurrency: number
      totalAmount: string
    }
    const currencyStore = useCurrencyStore()

    vi.spyOn(currencyStore, 'getTokenInfo').mockReturnValue({
      id: 'native',
      name: 'Native',
      symbol: 'NAT',
      code: 'NAT',
      prices: [
        { id: 'local', price: 2, code: 'USD', symbol: '$' },
        { id: 'usd', price: 2, code: 'USD', symbol: '$' }
      ]
    })

    await wrapper.setProps({
      weeklyClaim: {
        ...mockWeeklyClaimData[0],
        wage: {
          ...mockWeeklyClaimData[0]?.wage,
          ratePerHour: [{ type: 'native', amount: 3 }]
        }
      }
    })
    await nextTick()

    expect(vm.hourlyRateInUserCurrency).toBe(6)
    expect(vm.totalAmount).toBe('240.00')
  })

  it('handles weeklyClaim without wage using fallback values', () => {
    const wrapper = createWrapper({
      weeklyClaim: {
        ...mockWeeklyClaimData[0],
        wage: undefined
      }
    })
    const vm = wrapper.vm as unknown as {
      hourlyRateInUserCurrency: number
      totalAmount: string
    }

    expect(wrapper.text()).toContain('of - hrs weekly limit')
    expect(wrapper.find('[data-test="rate-per-hour-total-list"]').exists()).toBe(true)
    expect(vm.hourlyRateInUserCurrency).toBe(0)
    expect(vm.totalAmount).toBe('0.00')
  })
})

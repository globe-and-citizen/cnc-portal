import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import type { Address } from 'viem'
import ClaimHistoryWeekNavigator from '@/components/sections/ClaimHistoryView/ClaimHistoryWeekNavigator.vue'
import { getMonthWeeks } from '@/utils/dayUtils'
import { mockWeeklyClaimData } from '@/tests/mocks'
import { useGetTeamWeeklyClaimsQuery } from '@/queries'

dayjs.extend(utc)
dayjs.extend(isoWeek)

describe('ClaimHistoryWeekNavigator', () => {
  const baseWeeklyClaims = structuredClone(mockWeeklyClaimData)

  const januaryWeeks = getMonthWeeks(2024, 0)
  const selectedWeek =
    januaryWeeks.find((week) => week.isoString === '2024-01-01T00:00:00.000Z') ?? januaryWeeks[0]

  const createWrapper = () =>
    mount(ClaimHistoryWeekNavigator, {
      props: {
        memberAddress: mockWeeklyClaimData[0]?.memberAddress as Address,
        modelValue: selectedWeek!
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockWeeklyClaimData.splice(0, mockWeeklyClaimData.length, ...structuredClone(baseWeeklyClaims))
  })

  it('renders weeks, pending badge and chart data for selected week', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      barChartOption: { yAxis: { max: number }; series: Array<{ data: number[] }> }
    }
    const weeklyClaimsSpy = useGetTeamWeeklyClaimsQuery as unknown as {
      mock: {
        calls: Array<
          Array<{ queryParams: { teamId: { value: string }; userAddress: { value: string } } }>
        >
      }
    }

    expect(wrapper.find('[data-test="v-chart"]').exists()).toBe(true)
    expect(wrapper.find('.badge-primary').exists()).toBe(true)
    expect(wrapper.text()).toContain('pending')
    expect(weeklyClaimsSpy.mock.calls[0]?.[0]?.queryParams?.teamId?.value).toBeTruthy()
    expect(weeklyClaimsSpy.mock.calls[0]?.[0]?.queryParams?.userAddress?.value).toBe(
      mockWeeklyClaimData[0]?.memberAddress
    )

    expect(vm.barChartOption.yAxis.max).toBe(8)
    expect(vm.barChartOption.series[0]?.data[0]).toBe(8)
  })

  it('emits week update when a week item is clicked', async () => {
    const wrapper = createWrapper()

    const weekItems = wrapper.findAll('.border.rounded-lg.p-3.cursor-pointer')
    expect(weekItems.length).toBeGreaterThan(1)

    await weekItems[1]?.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toMatchObject({
      isoWeek: januaryWeeks[1]?.isoWeek,
      isoString: januaryWeeks[1]?.isoString
    })

    wrapper.findComponent({ name: 'MonthSelector' }).vm.$emit('update:modelValue', januaryWeeks[2])
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[1]?.[0]).toMatchObject({
      isoWeek: januaryWeeks[2]?.isoWeek,
      isoString: januaryWeeks[2]?.isoString
    })

    await wrapper.setProps({ modelValue: januaryWeeks[1] })
    expect(wrapper.find('.text-emerald-900').exists()).toBe(true)
  })

  it('uses fallback y-axis max when all daily hours are zero', () => {
    mockWeeklyClaimData[0] = {
      ...mockWeeklyClaimData[0],
      weekStart: selectedWeek?.isoString,
      claims: []
    }

    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      barChartOption: { yAxis: { max: number }; series: Array<{ data: number[] }> }
    }

    expect(vm.barChartOption.yAxis.max).toBe(24)
    expect(vm.barChartOption.series[0]?.data.every((value) => value === 0)).toBe(true)
  })

  it('handles selected week with no matching weekly claim', () => {
    mockWeeklyClaimData[0] = {
      ...mockWeeklyClaimData[0],
      weekStart: '2030-01-07T00:00:00.000Z'
    }

    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      barChartOption: { yAxis: { max: number }; series: Array<{ data: number[] }> }
    }

    expect(wrapper.find('.badge-primary').exists()).toBe(false)
    expect(vm.barChartOption.yAxis.max).toBe(24)
    expect(vm.barChartOption.series[0]?.data.every((value) => value === 0)).toBe(true)
  })

  it('returns correct colors for each claim status branch', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      getColor: (weeklyClaim?: { status?: string }) => string
    }

    expect(vm.getColor()).toBe('accent')
    expect(vm.getColor({ status: 'pending' })).toBe('primary')
    expect(vm.getColor({ status: 'signed' })).toBe('warning')
    expect(vm.getColor({ status: 'withdrawn' })).toBe('info')
    expect(vm.getColor({ status: 'processing' })).toBe('accent')
  })
})

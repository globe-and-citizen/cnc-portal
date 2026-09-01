import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import type { Address } from 'viem'
import type { WeeklyClaim } from '@/types'
import ClaimHistoryWeekNavigator from '@/components/sections/ClaimHistoryView/ClaimHistoryWeekNavigator.vue'
import { getMonthWeeks } from '@/utils/dates/calendar'
import { getClaimStatusColor } from '@/utils/claims/weekNavigation'
import { mockWeeklyClaimData } from '@/tests/mocks'
import { useGetTeamWeeklyClaimsQuery } from '@/queries'

dayjs.extend(utc)
dayjs.extend(isoWeek)

type ChartBar = number | { value: number; itemStyle?: { borderRadius?: number[] } }
type ChartOption = {
  yAxis: { max: number; axisLabel: { formatter: (value: number) => string } }
  tooltip: {
    formatter: (params: Array<{ name?: string; value?: number; dataIndex?: number }>) => string
  }
  series: [
    { data: ChartBar[] },
    { data: number[]; label?: { formatter?: (params: { dataIndex: number }) => string } }
  ]
}

describe('ClaimHistoryWeekNavigator', () => {
  const baseWeeklyClaims = structuredClone(mockWeeklyClaimData)
  const baseWeeklyClaim = baseWeeklyClaims[0]
  if (!baseWeeklyClaim) throw new Error('Expected weekly claim mock data')

  const januaryWeeks = getMonthWeeks(2024, 0)
  const selectedWeek =
    januaryWeeks.find((week) => week.isoString === '2024-01-01T00:00:00.000Z') ?? januaryWeeks[0]
  if (!selectedWeek) throw new Error('Expected January weeks to be generated')
  const secondWeek = januaryWeeks[1]
  if (!secondWeek) throw new Error('Expected second January week')
  const thirdWeek = januaryWeeks[2]
  if (!thirdWeek) throw new Error('Expected third January week')

  const getCurrentClaim = (): WeeklyClaim => {
    const currentClaim = mockWeeklyClaimData[0]
    if (!currentClaim) throw new Error('Expected weekly claim mock data')
    return currentClaim
  }

  const createWrapper = () =>
    mount(ClaimHistoryWeekNavigator, {
      props: {
        memberAddress: baseWeeklyClaim.memberAddress as Address,
        modelValue: selectedWeek
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  const getChartOption = (wrapper: ReturnType<typeof createWrapper>) =>
    wrapper.findComponent({ name: 'MockVChart' }).props('option') as ChartOption

  beforeEach(() => {
    vi.clearAllMocks()
    mockWeeklyClaimData.splice(0, mockWeeklyClaimData.length, ...structuredClone(baseWeeklyClaims))
  })

  it('renders weeks, pending badge and chart data for selected week', () => {
    const wrapper = createWrapper()
    const chartOption = getChartOption(wrapper)
    const weeklyClaimsSpy = vi.mocked(useGetTeamWeeklyClaimsQuery)

    expect(wrapper.find('[data-test="v-chart"]').exists()).toBe(true)
    expect(wrapper.find('.bg-primary').exists()).toBe(true)
    expect(wrapper.text()).toContain('pending')
    expect(weeklyClaimsSpy.mock.calls[0]?.[0]?.queryParams?.teamId?.value).toBeTruthy()
    expect(weeklyClaimsSpy.mock.calls[0]?.[0]?.queryParams?.userAddress?.value).toBe(
      baseWeeklyClaim.memberAddress
    )

    expect(chartOption.yAxis.max).toBe(8)
    const firstBar = chartOption.series[0].data[0]
    if (!firstBar || typeof firstBar === 'number' || !firstBar.itemStyle?.borderRadius) {
      throw new Error('Expected first bar item style data')
    }
    expect(firstBar).toMatchObject({ value: 8 })
    expect(firstBar.itemStyle.borderRadius).toEqual([6, 6, 0, 0])
  })

  it('emits week update when a week item is clicked', async () => {
    const wrapper = createWrapper()

    const weekItems = wrapper.findAll('.border.rounded-lg.p-3.cursor-pointer')
    expect(weekItems.length).toBeGreaterThan(1)

    await weekItems[1]?.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toMatchObject({
      isoWeek: secondWeek.isoWeek,
      isoString: secondWeek.isoString
    })

    wrapper.findComponent({ name: 'MonthSelector' }).vm.$emit('update:modelValue', thirdWeek)
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[1]?.[0]).toMatchObject({
      isoWeek: thirdWeek.isoWeek,
      isoString: thirdWeek.isoString
    })

    await wrapper.setProps({ modelValue: secondWeek as typeof selectedWeek })
    expect(wrapper.find('.text-emerald-900').exists()).toBe(true)
  })

  it('uses fallback y-axis max when all daily hours are zero', () => {
    const currentClaim = getCurrentClaim()

    mockWeeklyClaimData[0] = {
      ...currentClaim,
      weekStart: selectedWeek.isoString,
      claims: []
    } as WeeklyClaim

    const wrapper = createWrapper()
    const chartOption = getChartOption(wrapper)

    const regularSeriesValues = chartOption.series[0].data.map((entry) =>
      typeof entry === 'number' ? entry : entry.value
    )

    expect(chartOption.yAxis.max).toBe(24)
    expect(regularSeriesValues.every((value) => value === 0)).toBe(true)
  })

  it('handles selected week with no matching weekly claim', () => {
    const currentClaim = getCurrentClaim()

    mockWeeklyClaimData[0] = {
      ...currentClaim,
      weekStart: '2030-01-07T00:00:00.000Z'
    } as WeeklyClaim

    const wrapper = createWrapper()
    const chartOption = getChartOption(wrapper)

    const regularSeriesValues = chartOption.series[0].data.map((entry) =>
      typeof entry === 'number' ? entry : entry.value
    )

    expect(wrapper.find('.bg-primary').exists()).toBe(false)
    expect(chartOption.yAxis.max).toBe(24)
    expect(regularSeriesValues.every((value) => value === 0)).toBe(true)
  })

  it('returns correct colors for each claim status branch', () => {
    expect(getClaimStatusColor()).toBe('neutral')
    expect(getClaimStatusColor({ status: 'pending' })).toBe('primary')
    expect(getClaimStatusColor({ status: 'signed' })).toBe('warning')
    expect(getClaimStatusColor({ status: 'withdrawn' })).toBe('info')
    expect(getClaimStatusColor({ status: 'processing' })).toBe('neutral')
  })

  it('covers tooltip and label formatters and overtime bar styling', () => {
    const currentClaim = getCurrentClaim()

    mockWeeklyClaimData[0] = {
      ...currentClaim,
      weekStart: selectedWeek.isoString,
      wage: {
        ...currentClaim.wage,
        maximumHoursPerWeek: 8
      },
      claims: [
        {
          id: 1,
          hoursWorked: 600,
          minutesWorked: 600,
          dayWorked: '2024-01-01',
          createdAt: '2024-01-01T08:00:00Z',
          updatedAt: '2024-01-01T08:00:00Z',
          memo: 'overtime',
          wageId: 1,
          wage: currentClaim.wage
        }
      ]
    } as WeeklyClaim

    const wrapper = createWrapper()
    const chartOption = getChartOption(wrapper)

    const regularDayOne = chartOption.series[0].data[0]
    if (typeof regularDayOne === 'number' || !regularDayOne?.itemStyle?.borderRadius) {
      throw new Error('Expected first bar item style data')
    }
    expect(regularDayOne.value).toBe(8)
    expect(regularDayOne.itemStyle.borderRadius).toEqual([0, 0, 0, 0])

    const tooltipWithOvertime = chartOption.tooltip.formatter([
      { name: 'Mo', value: 8 },
      { name: 'Mo', value: 2 }
    ])
    expect(tooltipWithOvertime).toContain('Mo')
    expect(tooltipWithOvertime).toContain('Regular: 8h')
    expect(tooltipWithOvertime).toContain('Overtime: 2h')
    expect(tooltipWithOvertime).toContain('Total: 10h')

    const tooltipWithoutOvertime = chartOption.tooltip.formatter([
      { name: 'Tu', value: 0, dataIndex: 1 },
      { name: 'Tu', value: 0, dataIndex: 1 }
    ])
    expect(tooltipWithoutOvertime).toBe('Tu\n0h')

    const tooltipWithEmptyParams = chartOption.tooltip.formatter([])
    expect(tooltipWithEmptyParams).toBe('Regular: 8h\nOvertime: 2h\nTotal: 10h')

    const tooltipOutOfRange = chartOption.tooltip.formatter([{ name: 'Sa', dataIndex: 12 }])
    expect(tooltipOutOfRange).toBe('Sa\n0h')

    expect(chartOption.yAxis.axisLabel.formatter(1.25)).toBe('1.3 h')

    const overtimeLabelFormatter = chartOption.series[1].label?.formatter
    expect(overtimeLabelFormatter?.({ dataIndex: 0 })).toBe('10h')
    expect(overtimeLabelFormatter?.({ dataIndex: 6 })).toBe('')
    expect(overtimeLabelFormatter?.({ dataIndex: 99 })).toBe('')
  })
})

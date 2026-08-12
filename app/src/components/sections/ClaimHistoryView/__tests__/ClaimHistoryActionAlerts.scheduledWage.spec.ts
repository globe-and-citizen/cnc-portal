import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mockUserStore, mockWageData } from '@/tests/mocks'
import { useGetTeamWagesQuery } from '@/queries'
import {
  baseAddress,
  createWeeklyClaim,
  createWrapper,
  openModalForDayMock
} from './claimHistoryActionAlerts.harness'

describe('ClaimHistoryActionAlerts - scheduled wage notice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.address = baseAddress
    openModalForDayMock.mockReset()
  })

  const withScheduledWage = () =>
    (
      useGetTeamWagesQuery as unknown as { mockReturnValueOnce: (value: unknown) => void }
    ).mockReturnValueOnce({
      data: ref([
        {
          ...mockWageData[0],
          userAddress: baseAddress,
          scheduledWage: {
            ...mockWageData[0],
            userAddress: baseAddress,
            effectiveFrom: '2026-08-17T00:00:00.000Z',
            ratePerHour: [{ type: 'sher', amount: 10 }],
            maximumHoursPerWeek: 15,
            maximumHoursPerDay: 8
          }
        }
      ]),
      error: ref(null)
    })

  const alertFor = (selectedWeekStart: string) => {
    const wrapper = createWrapper({ weeklyClaim: createWeeklyClaim(), selectedWeekStart })
    return wrapper.find('[data-test="scheduled-wage-alert"]')
  }

  it('announces the rate and both hour ceilings on a week that predates the change', () => {
    withScheduledWage()

    const alert = alertFor('2026-08-10T00:00:00.000Z')

    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('SHER 10')
    expect(alert.text()).toContain('15h/wk')
    expect(alert.text()).toContain('8h/d')
  })

  it.each([
    ['the week the change takes effect', '2026-08-17T00:00:00.000Z'],
    ['a week after the change took effect', '2026-08-24T00:00:00.000Z']
  ])('hides the notice on %s', (_label, selectedWeekStart) => {
    // Those weeks already run on the new wage, so calling it upcoming — and
    // saying the week keeps the current rate — would be false.
    withScheduledWage()

    expect(alertFor(selectedWeekStart).exists()).toBe(false)
  })

  it('shows no notice when no change is scheduled', () => {
    expect(alertFor('2026-08-10T00:00:00.000Z').exists()).toBe(false)
  })
})

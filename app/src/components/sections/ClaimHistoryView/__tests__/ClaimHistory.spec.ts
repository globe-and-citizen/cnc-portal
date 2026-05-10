import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent, nextTick, ref } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import { useRoute } from 'vue-router'
import { useGetTeamWeeklyClaimsQuery, useGetTeamWagesQuery } from '@/queries'

dayjs.extend(utc)
dayjs.extend(isoWeek)

import ClaimHistory from '../ClaimHistory.vue'

describe('ClaimHistory.vue', () => {
  const openSubmitClaimForDayMock = vi.fn()

  const createWrapper = () =>
    mount(ClaimHistory, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: { useTeamStore: { currentTeamId: '1' } }
          })
        ],
        stubs: {
          ClaimHistoryMemberHeader: {
            template: '<div class="h" data-test="member-header" />'
          },
          ClaimHistoryWeekNavigator: {
            emits: ['update:modelValue'],
            template:
              '<button data-test="week-nav" @click="$emit(\'update:modelValue\', { year: 2025, month: 0, isoWeek: 1, isoString: \'2024-12-30T00:00:00.000Z\', formatted: \'Dec 30-Jan 5\' })" />'
          },
          WeeklyRecap: {
            template: '<div class="r" data-test="weekly-recap" />'
          },
          ClaimHistoryActionAlerts: defineComponent({
            name: 'ClaimHistoryActionAlerts',
            setup(_, { expose }) {
              expose({ openSubmitClaimForDay: openSubmitClaimForDayMock })
              return {}
            },
            template: '<div class="a" data-test="action-alerts" />'
          }),
          ClaimHistoryDailyBreakdown: defineComponent({
            name: 'ClaimHistoryDailyBreakdown',
            emits: ['quick-submit'],
            template:
              '<button data-test="quick-submit-trigger" @click="$emit(\'quick-submit\', \'2024-01-01T00:00:00.000Z\')" />'
          })
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    openSubmitClaimForDayMock.mockReset()
  })

  it('renders claim history content when route contains memberAddress', () => {
    ;(useRoute as unknown as { mockReturnValueOnce: (value: unknown) => void }).mockReturnValueOnce({
      params: { memberAddress: '0x1234567890123456789012345678901234567890' }
    })

    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="member-header"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="week-nav"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="weekly-recap"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="action-alerts"]').exists()).toBe(true)
    expect(useGetTeamWeeklyClaimsQuery).toHaveBeenCalledTimes(1)
    expect(useGetTeamWagesQuery).toHaveBeenCalledTimes(1)
    const weeklyClaimsArgs = (useGetTeamWeeklyClaimsQuery as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]?.[0] as {
      queryParams: { teamId: { value: string | number }; userAddress: { value: string } }
    }
    const wagesArgs = (useGetTeamWagesQuery as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]?.[0] as { queryParams: { teamId: { value: string | number } } }
    expect(weeklyClaimsArgs.queryParams.teamId.value).toBe('1')
    expect(weeklyClaimsArgs.queryParams.userAddress.value).toBe(
      '0x1234567890123456789012345678901234567890'
    )
    expect(wagesArgs.queryParams.teamId.value).toBe('1')
  })

  it('does not render claim history content when memberAddress is missing', () => {
    const wrapper = createWrapper()

    expect(wrapper.vm.selectedMemberAddress).toBeUndefined()
    expect(wrapper.find('[data-test="member-header"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="week-nav"]').exists()).toBe(false)
  })

  it('selects current week claim and member wage from query data', () => {
    const memberAddress = '0x1234567890123456789012345678901234567890'
    const currentWeekIso = dayjs.utc().startOf('isoWeek').toISOString()

    ;(useRoute as unknown as { mockReturnValueOnce: (value: unknown) => void }).mockReturnValueOnce({
      params: { memberAddress }
    })
    ;(
      useGetTeamWeeklyClaimsQuery as unknown as { mockReturnValueOnce: (value: unknown) => void }
    ).mockReturnValueOnce({
      data: ref([
        { weekStart: '2024-01-01T00:00:00.000Z' },
        { weekStart: currentWeekIso, status: 'pending', wage: { userAddress: memberAddress } }
      ])
    })
    ;(useGetTeamWagesQuery as unknown as { mockReturnValueOnce: (value: unknown) => void }).mockReturnValueOnce({
      data: ref([{ userAddress: memberAddress }, { userAddress: '0x0000000000000000000000000000000000000000' }])
    })

    const wrapper = createWrapper()

    expect(wrapper.vm.selectedMemberAddress).toBe(memberAddress)
    expect(wrapper.vm.selectWeekWeelyClaim).toEqual(
      expect.objectContaining({ weekStart: currentWeekIso })
    )
    expect(wrapper.vm.selectedMemberWage).toEqual(expect.objectContaining({ userAddress: memberAddress }))
  })

  it('updates selected week claim when selectedMonthObject changes', async () => {
    const memberAddress = '0x1234567890123456789012345678901234567890'
    const firstWeekIso = '2025-04-07T00:00:00.000Z'
    const secondWeekIso = '2025-04-14T00:00:00.000Z'

    ;(useRoute as unknown as { mockReturnValueOnce: (value: unknown) => void }).mockReturnValueOnce({
      params: { memberAddress }
    })
    ;(
      useGetTeamWeeklyClaimsQuery as unknown as { mockReturnValueOnce: (value: unknown) => void }
    ).mockReturnValueOnce({
      data: ref([{ weekStart: firstWeekIso }, { weekStart: secondWeekIso }])
    })

    const wrapper = createWrapper()

    wrapper.vm.selectedMonthObject = {
      year: 2025,
      month: 3,
      isoWeek: 15,
      isoString: firstWeekIso,
      formatted: 'April 7-13'
    }
    await nextTick()

    expect(wrapper.vm.selectWeekWeelyClaim).toEqual(expect.objectContaining({ weekStart: firstWeekIso }))

    wrapper.vm.selectedMonthObject = {
      year: 2025,
      month: 3,
      isoWeek: 16,
      isoString: secondWeekIso,
      formatted: 'April 14-20'
    }
    await nextTick()

    expect(wrapper.vm.selectWeekWeelyClaim).toEqual(
      expect.objectContaining({ weekStart: secondWeekIso })
    )
  })

  it('forwards quick-submit event to action alerts exposed method', async () => {
    ;(useRoute as unknown as { mockReturnValueOnce: (value: unknown) => void }).mockReturnValueOnce({
      params: { memberAddress: '0x1234567890123456789012345678901234567890' }
    })

    const wrapper = createWrapper()
    await wrapper.find('[data-test="quick-submit-trigger"]').trigger('click')

    expect(openSubmitClaimForDayMock).toHaveBeenCalledWith('2024-01-01T00:00:00.000Z')
  })

  it('updates selectedMonthObject when week navigator emits v-model update', async () => {
    ;(useRoute as unknown as { mockReturnValueOnce: (value: unknown) => void }).mockReturnValueOnce({
      params: { memberAddress: '0x1234567890123456789012345678901234567890' }
    })

    const wrapper = createWrapper()
    await wrapper.find('[data-test="week-nav"]').trigger('click')

    expect(wrapper.vm.selectedMonthObject).toEqual({
      year: 2025,
      month: 0,
      isoWeek: 1,
      isoString: '2024-12-30T00:00:00.000Z',
      formatted: 'Dec 30-Jan 5'
    })
  })
})

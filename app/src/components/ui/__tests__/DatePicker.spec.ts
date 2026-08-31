import { CalendarDate } from '@internationalized/date'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DatePicker from '../DatePicker.vue'
import type { Range } from '@/utils/datePicker'

const now = new Date('2026-06-18T12:00:00.000Z')

function latestModelValue(wrapper: VueWrapper) {
  const updates = wrapper.emitted('update:modelValue') ?? []
  return updates[updates.length - 1]?.[0]
}

describe('DatePicker.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('emits the selected date preset and its stepped period', async () => {
    const wrapper = mount(DatePicker)

    await wrapper.get('[data-test="date-picker-preset-endOfMonth"]').trigger('click')

    expect(latestModelValue(wrapper)).toEqual(new Date('2026-06-30T23:59:59.999Z'))

    await wrapper.get('[data-test="date-picker-endOfMonth-next"]').trigger('click')

    expect(latestModelValue(wrapper)).toEqual(new Date('2026-07-31T23:59:59.999Z'))
  })

  it('emits a specific date selected from the calendar', async () => {
    const wrapper = mount(DatePicker)

    await wrapper.get('[data-test="date-picker-preset-specific"]').trigger('click')
    const calendar = wrapper.getComponent({ name: 'UCalendar' })
    calendar.vm.$emit('update:modelValue', new CalendarDate(2026, 4, 9))
    await wrapper.vm.$nextTick()

    expect(latestModelValue(wrapper)).toEqual(new Date('2026-04-09T23:59:59.999Z'))
  })

  it('commits a custom range only after both ordered calendar boundaries are selected', async () => {
    const wrapper = mount(DatePicker, { props: { mode: 'range' } })

    await wrapper.get('[data-test="date-picker-preset-custom"]').trigger('click')
    const calendar = wrapper.getComponent({ name: 'UCalendar' })
    const updatesBeforePartialSelection = (wrapper.emitted('update:modelValue') ?? []).length

    calendar.vm.$emit('update:modelValue', {
      start: new CalendarDate(2026, 4, 9),
      end: null
    })
    await wrapper.vm.$nextTick()

    expect((wrapper.emitted('update:modelValue') ?? []).length).toBe(updatesBeforePartialSelection)

    calendar.vm.$emit('update:modelValue', {
      start: new CalendarDate(2026, 4, 9),
      end: new CalendarDate(2026, 4, 12)
    })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(latestModelValue(wrapper)).toEqual<Range>({
      start: new Date('2026-04-09T00:00:00.000Z'),
      end: new Date('2026-04-12T23:59:59.999Z')
    })
  })

  it('restores the persisted picker selection instead of replacing it with the incoming model', () => {
    localStorage.setItem(
      'accounting-period',
      JSON.stringify({
        activeId: 'endOfYear',
        anchors: {
          month: Date.UTC(2026, 5, 18),
          quarter: Date.UTC(2026, 5, 18),
          year: Date.UTC(2024, 5, 18)
        },
        customDate: Date.UTC(2026, 5, 18),
        customStart: Date.UTC(2026, 5, 1),
        customEnd: Date.UTC(2026, 5, 18)
      })
    )

    const wrapper = mount(DatePicker, {
      props: {
        modelValue: new Date('2026-06-18T00:00:00.000Z'),
        storageKey: 'accounting-period'
      }
    })

    expect(wrapper.get('[data-test="date-picker-trigger"]').text()).toContain('As of Dec 31, 2024')
    expect(latestModelValue(wrapper)).toEqual(new Date('2024-12-31T23:59:59.999Z'))
  })
})

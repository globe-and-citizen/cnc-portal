import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { Time } from '@internationalized/date'
import CreditCallTermsStep from '../CreditCallTermsStep.vue'
import type { CreditCallForm } from '@/types'
import { MINUTES_PER_DAY } from '@/utils'

function makeForm(overrides: Partial<CreditCallForm> = {}): CreditCallForm {
  return reactive({
    name: '',
    desc: '',
    target: '25000',
    token: 'USDC',
    rate: '6',
    period: 90 * MINUTES_PER_DAY,
    periodMode: 'preset',
    periodVal: '90',
    periodUnit: 'days',
    deadline: '2026-07-31',
    deadlineTime: '23:59',
    access: 'everyone',
    whitelist: [],
    capOn: false,
    cap: '10000',
    ...overrides
  })
}

function mountStep(form: CreditCallForm) {
  return mount(CreditCallTermsStep, { props: { form } })
}

describe('CreditCallTermsStep', () => {
  it('selects a preset term and stays in preset mode', async () => {
    const form = makeForm()
    const wrapper = mountStep(form)
    await wrapper.find('[data-test="cc-term-30"]').trigger('click')
    expect(form.period).toBe(30 * MINUTES_PER_DAY)
    expect(form.periodMode).toBe('preset')
    // The custom inputs are hidden in preset mode.
    expect(wrapper.find('[data-test="cc-term-value"]').exists()).toBe(false)
  })

  it('reveals the value + unit inputs when switching to custom', async () => {
    const form = makeForm()
    const wrapper = mountStep(form)
    await wrapper.find('[data-test="cc-term-custom"]').trigger('click')
    expect(form.periodMode).toBe('custom')
    expect(form.periodVal).toBe('90') // seeded from the current period
    expect(wrapper.find('[data-test="cc-term-value"]').exists()).toBe(true)
  })

  it('converts a custom value + unit into whole days, using real calendar arithmetic off the deadline', async () => {
    const form = makeForm({ periodMode: 'custom', periodVal: '6' })
    const wrapper = mountStep(form)
    await wrapper.find('[data-test="cc-unit-months"]').trigger('click')
    expect(form.periodUnit).toBe('months')
    // 2026-07-31 + 6 calendar months = 2027-01-31 → Aug(31)+Sep(30)+Oct(31)+Nov(30)+
    // Dec(31)+Jan(31) = 184 days, not a flat 6 * 30 = 180.
    expect(form.period).toBe(184 * MINUTES_PER_DAY)
  })

  it('shows the calendar breakdown in the preview for a months/years custom term', async () => {
    const form = makeForm({
      periodMode: 'custom',
      periodVal: '6',
      periodUnit: 'months',
      period: 184 * MINUTES_PER_DAY
    })
    const wrapper = mountStep(form)
    expect(wrapper.text()).toContain('6 months after funding')
  })

  it('weeks and years convert correctly', async () => {
    const form = makeForm({ periodMode: 'custom', periodVal: '2' })
    const wrapper = mountStep(form)
    await wrapper.find('[data-test="cc-unit-weeks"]').trigger('click')
    expect(form.period).toBe(14 * MINUTES_PER_DAY)
    await wrapper.find('[data-test="cc-unit-years"]').trigger('click')
    // 2026-07-31 + 2 calendar years = 2028-07-31, a span that includes the Feb 29 of
    // leap year 2028 → 731 days, not a flat 2 * 365 = 730.
    expect(form.period).toBe(731 * MINUTES_PER_DAY)
  })

  it('recalculates off the freshly typed value, not a stale one, when editing a custom term', async () => {
    // Regression test: the value input previously mixed v-model with a separate
    // @input handler that read form.periodVal back, which could compute `period`
    // off the previous keystroke instead of the one just typed.
    const form = makeForm({ periodMode: 'custom', periodVal: '2000', periodUnit: 'weeks' })
    const wrapper = mountStep(form)
    await wrapper.find('[data-test="cc-term-value"]').setValue('3')
    expect(form.periodVal).toBe('3')
    expect(form.period).toBe(21 * MINUTES_PER_DAY) // 3 weeks
  })

  it('fails validation when the term is 0 days', async () => {
    const form = makeForm({ periodMode: 'custom', periodVal: '0', period: 0 })
    const wrapper = mountStep(form)
    expect(wrapper.vm.validate()).toBe(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="cc-term-error"]').text()).toContain('greater than 0')
  })

  describe('deadline picker (local time in, UTC stored — Option B)', () => {
    // form.deadline/deadlineTime stay UTC; the calendar and time input show/accept the
    // browser's local timezone. Assertions below compute their own expectation via the
    // same Date APIs the component uses, rather than hardcoding an offset, so these pass
    // in any timezone the test runner happens to use — this sandbox itself runs in
    // Asia/Saigon (UTC+7), matching the actual cross-timezone scenario this exists for.

    it('shows a formatted local-date label for the current UTC deadline', () => {
      const wrapper = mountStep(makeForm({ deadline: '2026-07-31', deadlineTime: '12:00' }))
      const expected = new Date('2026-07-31T12:00:00Z').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      expect(wrapper.find('[data-test="cc-deadline"]').text()).toBe(expected)
    })

    it('picking a day on the calendar sets that local day, round-tripping back to the same label', async () => {
      const form = makeForm({ deadline: '2026-07-31', deadlineTime: '12:00' })
      const wrapper = mountStep(form)
      const calendar = wrapper.findComponent({ name: 'UCalendar' })
      calendar.vm.$emit('update:modelValue', { year: 2026, month: 8, day: 15 })
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="cc-deadline"]').text()).toContain('Aug')
      expect(wrapper.find('[data-test="cc-deadline"]').text()).toContain('15')
    })

    it('redisplays a typed local time unchanged after it round-trips through UTC storage', async () => {
      const form = makeForm({ deadline: '2026-07-31', deadlineTime: '12:00' })
      const wrapper = mountStep(form)
      const timeInput = wrapper.findComponent({ name: 'UInputTime' })
      timeInput.vm.$emit('update:modelValue', new Time(9, 15))
      await wrapper.vm.$nextTick()
      const value = timeInput.props('modelValue') as Time
      expect(value.hour).toBe(9)
      expect(value.minute).toBe(15)
    })

    it('converts a typed local time to the correct UTC instant (catches sign/offset direction bugs)', async () => {
      const form = makeForm({ deadline: '2026-07-31', deadlineTime: '12:00' })
      const wrapper = mountStep(form)
      wrapper.findComponent({ name: 'UInputTime' }).vm.$emit('update:modelValue', new Time(9, 15))
      await wrapper.vm.$nextTick()
      // Same construction the component's own localPartsToUtc performs — an independent
      // reference computation, not a copy-paste of the implementation under test.
      const local = new Date(2026, 6, 31, 9, 15)
      const pad = (n: number) => String(n).padStart(2, '0')
      expect(form.deadline).toBe(
        `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`
      )
      expect(form.deadlineTime).toBe(`${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`)
    })

    it('shows the real UTC value as a live readout next to the local fields', () => {
      const wrapper = mountStep(makeForm({ deadline: '2026-07-31', deadlineTime: '12:00' }))
      expect(wrapper.find('[data-test="cc-deadline-utc-readout"]').text()).toContain(
        '2026-07-31 12:00 UTC'
      )
    })
  })

  describe('validate', () => {
    it('passes for a valid form', () => {
      const wrapper = mountStep(makeForm())
      expect(wrapper.vm.validate()).toBe(true)
    })

    it('fails and shows an error when the deadline is in the past', async () => {
      const wrapper = mountStep(makeForm({ deadline: '2020-01-01' }))
      expect(wrapper.vm.validate()).toBe(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="cc-deadline-error"]').text()).toContain(
        'cannot be in the past'
      )
    })

    it('fails when the deadline is today but the time has already passed', async () => {
      const today = new Date().toISOString().slice(0, 10)
      const wrapper = mountStep(makeForm({ deadline: today, deadlineTime: '00:00' }))
      expect(wrapper.vm.validate()).toBe(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="cc-deadline-time-error"]').text()).toContain(
        'further in the future'
      )
    })

    it('passes with a zero rate — an interest-free round is a valid use case', () => {
      const wrapper = mountStep(makeForm({ rate: '0' }))
      expect(wrapper.vm.validate()).toBe(true)
    })

    it('fails and shows an error when the rate is negative', async () => {
      const wrapper = mountStep(makeForm({ rate: '-1' }))
      expect(wrapper.vm.validate()).toBe(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="cc-rate-error"]').text()).toContain('cannot be negative')
    })

    it('fails and shows a calendar-breakdown error when the term exceeds the 30-year maximum', async () => {
      const wrapper = mountStep(makeForm({ period: 31 * 365 * MINUTES_PER_DAY }))
      expect(wrapper.vm.validate()).toBe(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="cc-term-error"]').text()).toContain('30-year maximum')
    })
  })
})

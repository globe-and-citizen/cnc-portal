/**
 * The dates an election is created with — the one thing the portal used to
 * decide on the owner's behalf, turning a week-long ballot into sixty seconds.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  clockTime,
  emittedPayload,
  getVm,
  inDays,
  mountComponent,
  tomorrow
} from './CreateElectionForm.harness'

describe('CreateElectionForm — opening', () => {
  it('says when an unpicked opening falls', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    expect(vm.openingHelp).toContain('Opens at')
    expect(vm.openingHelp).toContain('2 min')
    // The opening reads as a choice the owner may skip, not as a filled-in value.
    expect(wrapper.find('[data-test="startDayButton"]').text()).toContain('Pick a day (optional)')
  })

  it('prefills a workable time when the opening day is picked', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.pickStartDay(tomorrow())
    expect(vm.state.startTime).toBe('00:00')

    // Today has already used up its midnight, so the time starts a couple of
    // minutes out — rounded up to the minute the field can express.
    vm.pickStartDay(new Date())
    expect(vm.state.startTime).toBe(clockTime(new Date(Date.now() + 3 * 60 * 1000)))
    expect(vm.openingHelp).toContain('exactly')
  })

  it('refuses an opening that has already gone by, without rewriting it', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.state.startDay = inDays(-1)
    vm.state.startTime = '12:00'
    vm.state.endDay = tomorrow()
    vm.formData = [{ address: '0x1', name: 'Alice' }]

    vm.submitForm()

    expect(vm.errors.startDate).toBe('The opening has already gone by. Pick a later day or time.')
    expect(wrapper.emitted('createProposal')).toBeFalsy()
  })

  it('refuses an opening time it cannot read', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.state.startDay = tomorrow()
    vm.state.startTime = ''
    vm.state.endDay = tomorrow()
    vm.formData = [{ address: '0x1', name: 'Alice' }]

    vm.submitForm()

    expect(vm.errors.startDate).toBe('The opening time must be given as hh:mm')
    expect(wrapper.emitted('createProposal')).toBeFalsy()
  })

  it('works out the default opening at submit time, not when the form was opened', () => {
    vi.useFakeTimers()
    try {
      const wrapper = mountComponent()
      const vm = getVm(wrapper)

      vm.state.endDay = tomorrow()
      vm.state.winnerCount = '1'
      vm.formData = [{ address: '0x1', name: 'Alice' }]

      // The owner leaves the modal open for ten minutes before submitting.
      vi.advanceTimersByTime(10 * 60 * 1000)
      vm.submitForm()

      expect(emittedPayload(wrapper).startDate.getTime()).toBe(Date.now() + 2 * 60 * 1000)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('CreateElectionForm — closing', () => {
  it('sets endDate required error when no closing day is picked', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.state.endDay = null
    vm.formData = [{ address: '0x1', name: 'Alice' }]

    vm.submitForm()

    expect(vm.errors.endDate).toBe('A closing day is required')
    expect(wrapper.emitted('createProposal')).toBeFalsy()
  })

  it('refuses a closing time that cannot be read', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.state.endDay = tomorrow()
    vm.state.endTime = ''
    vm.formData = [{ address: '0x1', name: 'Alice' }]

    vm.submitForm()

    expect(vm.errors.endDate).toBe('The closing time must be given as hh:mm')
    expect(wrapper.emitted('createProposal')).toBeFalsy()
  })

  it('refuses a ballot closing before it opens or too soon after, naming the minimum', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)
    vm.formData = [{ address: '0x1', name: 'Alice' }]

    vm.state.endDay = inDays(-1)
    vm.state.endTime = '12:00'
    vm.submitForm()
    expect(vm.errors.endDate).toContain('at least 5 min')

    const soon = new Date(Date.now() + 3 * 60 * 1000)
    vm.state.endDay = soon
    vm.state.endTime = clockTime(soon)
    vm.submitForm()
    expect(vm.errors.endDate).toContain('at least 5 min')
    expect(wrapper.emitted('createProposal')).toBeFalsy()
  })

  it('runs the ballot to the end of the day when the time is left untouched', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)
    const day = tomorrow()

    vm.state.endDay = day
    vm.state.winnerCount = '1'
    vm.formData = [{ address: '0x1', name: 'Alice' }]

    vm.submitForm()

    const endDate = emittedPayload(wrapper).endDate
    expect(endDate.getHours()).toBe(23)
    expect(endDate.getMinutes()).toBe(59)
    expect(endDate.getDate()).toBe(day.getDate())
  })
})

describe('CreateElectionForm — what is emitted', () => {
  it('emits the exact moments the owner picked, days ahead', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)
    const openingDay = inDays(10)
    const closingDay = inDays(17)

    vm.state.title = 'Election 2026'
    vm.state.description = 'Board election for the next organizational cycle.'
    vm.state.winnerCount = '3'
    vm.state.startDay = openingDay
    vm.state.startTime = '09:30'
    vm.state.endDay = closingDay
    vm.state.endTime = '18:00'
    vm.formData = [
      { address: '0x1', name: 'Alice' },
      { address: '0x2', name: 'Bob' },
      { address: '0x3', name: 'Carol' }
    ]

    vm.submitForm()

    const payload = emittedPayload(wrapper)
    const expectedStart = new Date(openingDay)
    expectedStart.setHours(9, 30, 0, 0)
    const expectedEnd = new Date(closingDay)
    expectedEnd.setHours(18, 0, 0, 0)

    expect(payload.startDate.getTime()).toBe(expectedStart.getTime())
    expect(payload.endDate.getTime()).toBe(expectedEnd.getTime())
    expect(payload.candidates).toEqual([
      { name: 'Alice', candidateAddress: '0x1' },
      { name: 'Bob', candidateAddress: '0x2' },
      { name: 'Carol', candidateAddress: '0x3' }
    ])
  })
})

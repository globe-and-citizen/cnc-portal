import { describe, it, expect } from 'vitest'
import {
  presetsForMode,
  defaultPresetId,
  defaultValueForMode,
  resolveRange,
  resolveAsOfDate,
  stepAnchor,
  isValidRange,
  formatAnchorLabel,
  formatAsOfLabel,
  formatRangeLabel,
  toUnixSeconds,
  type DatePickerPreset,
  type Range
} from '../datePicker'

const preset = (mode: 'date' | 'range', id: string): DatePickerPreset =>
  presetsForMode(mode).find((p) => p.id === id)!

describe('datePicker presets', () => {
  it('exposes the date-mode presets, Today first', () => {
    const ids = presetsForMode('date').map((p) => p.id)
    expect(ids).toEqual(['today', 'endOfMonth', 'endOfQuarter', 'endOfYear', 'specific'])
    expect(defaultPresetId('date')).toBe('today')
  })

  it('exposes the range-mode presets, All time first', () => {
    const ids = presetsForMode('range').map((p) => p.id)
    expect(ids).toEqual(['allTime', 'month', 'quarter', 'year', 'custom'])
    expect(defaultPresetId('range')).toBe('allTime')
  })
})

describe('resolveRange', () => {
  const anchor = new Date(2026, 5, 18) // 18 Jun 2026

  it('all-time spans from the epoch to the end of today', () => {
    const r = resolveRange(preset('range', 'allTime'), anchor, { start: anchor, end: anchor })
    expect(r.start.getTime()).toBe(0)
    expect(r.end.getTime()).toBeGreaterThan(r.start.getTime())
  })

  it('month preset covers the anchored month', () => {
    const r = resolveRange(preset('range', 'month'), anchor, { start: anchor, end: anchor })
    expect(r.start.getMonth()).toBe(5)
    expect(r.start.getDate()).toBe(1)
    expect(r.end.getMonth()).toBe(5)
    expect(r.end.getDate()).toBe(30)
  })

  it('quarter preset covers Q2 (Apr–Jun) for a June anchor', () => {
    const r = resolveRange(preset('range', 'quarter'), anchor, { start: anchor, end: anchor })
    expect(r.start.getMonth()).toBe(3)
    expect(r.end.getMonth()).toBe(5)
  })
})

describe('resolveAsOfDate', () => {
  it('end-of-year preset resolves to Dec 31 of the anchored year', () => {
    const d = resolveAsOfDate(
      preset('date', 'endOfYear'),
      new Date(2026, 5, 18),
      new Date(2026, 5, 18)
    )
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(11)
    expect(d.getDate()).toBe(31)
  })
})

describe('helpers', () => {
  it('stepAnchor moves a month forward and backward', () => {
    expect(stepAnchor(new Date(2026, 5, 15), 'month', 1).getMonth()).toBe(6)
    expect(stepAnchor(new Date(2026, 5, 15), 'month', -1).getMonth()).toBe(4)
  })

  it('isValidRange rejects a backwards range', () => {
    const start = new Date(2026, 5, 10)
    const end = new Date(2026, 5, 1)
    expect(isValidRange({ start, end })).toBe(false)
    expect(isValidRange({ start: end, end: start })).toBe(true)
  })

  it('formats anchor / trigger labels', () => {
    expect(formatAnchorLabel(new Date(2026, 1, 15), 'month')).toBe('February 2026')
    expect(formatAnchorLabel(new Date(2026, 5, 15), 'quarter')).toBe('Apr – Jun 2026')
    expect(formatAnchorLabel(new Date(2026, 5, 15), 'year')).toBe('2026')
    expect(formatAsOfLabel(new Date(2026, 5, 3))).toBe('As of Jun 3, 2026')
    const range: Range = { start: new Date(2026, 0, 12), end: new Date(2026, 11, 25) }
    expect(formatRangeLabel(range)).toBe('From Jan 12, 2026 to Dec 25, 2026')
  })

  it('defaultValueForMode seeds all-time for range and a Date for date mode', () => {
    const range = defaultValueForMode('range') as Range
    expect(range.start.getTime()).toBe(0)
    expect(defaultValueForMode('date')).toBeInstanceOf(Date)
  })

  it('toUnixSeconds floors to whole seconds', () => {
    expect(toUnixSeconds(new Date(1500))).toBe(1)
  })
})

import { describe, expect, it } from 'vitest'
import { spreadsheetNumber, spreadsheetUsd } from '../spreadsheetNumber'
import { usdAmountFromNumber } from '@/utils/accounting/monetaryAmount'

describe('spreadsheet numeric precision', () => {
  it('rounds monetary and rate values to the screen precision', () => {
    expect(spreadsheetUsd(usdAmountFromNumber(1.005))).toBe(1.01)
    expect(spreadsheetUsd(usdAmountFromNumber(-1.005))).toBe(-1.01)
    expect(spreadsheetUsd(usdAmountFromNumber(-0.005))).toBe(0)
    expect(spreadsheetNumber(0.1234567, 6)).toBe(0.123457)
  })

  it('makes missing and unrepresentable values explicit', () => {
    expect(spreadsheetUsd(undefined)).toBe('')
    expect(spreadsheetNumber(null, 6)).toBe('Unavailable')
    expect(spreadsheetNumber(Infinity, 2)).toBe('Unavailable')
    expect(spreadsheetNumber(10 ** 13, 2)).toBe('Unavailable')
  })
})

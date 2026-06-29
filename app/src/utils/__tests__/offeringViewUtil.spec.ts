import { describe, expect, it } from 'vitest'
import {
  buildFixedReturnLenderRows,
  getFixedReturnStatusMeta,
  getLenderOfferingLimitsHint,
  getOfferingDetailTotals,
  getOfferingFormSummary,
  getOfferingProgressColor,
  getOfferingRepaymentStatus,
  getWhitelistAllocationSummary,
  isOfferingPastMaturity,
  isWhitelistAmountOverCap
} from '../offeringViewUtil'
import { USDC_ADDRESS } from '@/constant'
import type { LenderOffering, OfferingForm, OfferingSummary } from '@/types'

const TOKEN = '0x1111111111111111111111111111111111111111' as const

describe('offeringViewUtil', () => {
  it('derives repayment status, progress color, and maturity', () => {
    expect(getOfferingRepaymentStatus(0, false)).toBe('on-track')
    expect(getOfferingRepaymentStatus(0.5, false)).toBe('partial')
    expect(getOfferingRepaymentStatus(0, true)).toBe('overdue')
    expect(getOfferingRepaymentStatus(1, false)).toBe('completed')
    expect(getOfferingProgressColor('overdue')).toBe('error')
    expect(isOfferingPastMaturity('2020-01-01', 1, 'months', new Date('2020-03-01'))).toBe(true)
  })

  it('builds formatted lender rows and aggregate totals', () => {
    const offering: OfferingSummary = {
      id: '1',
      title: 'Note',
      rate: 8,
      term: 12,
      termUnit: 'months',
      startDate: '2030-01-01',
      access: 'general',
      raised: 1000,
      target: 1000,
      totalRepaid: 540,
      status: 'funded',
      token: USDC_ADDRESS
    }
    const lenders = [{ address: TOKEN, principal: 500, expected: 540 }]
    const rows = buildFixedReturnLenderRows({
      lenders,
      offering,
      pastMaturity: false,
      maturity: '01 Jan 2031',
      resolveName: () => 'Alice'
    })

    expect(rows[0]).toMatchObject({
      name: 'Alice',
      paidFmt: '270 USDC',
      pct: 50,
      status: 'partial'
    })
    expect(getOfferingDetailTotals(lenders, 540)).toEqual({
      totalPrincipal: 500,
      totalExpected: 540,
      totalPaid: 540
    })
  })

  it('derives form and lender-facing summary copy', () => {
    const form: OfferingForm = {
      title: 'Note',
      purpose: '',
      principal: 1000,
      rate: 8,
      termValue: 12,
      termUnit: 'months',
      startDate: '2030-01-01',
      deadline: '2029-12-01',
      access: 'whitelist',
      capOn: true,
      cap: 500,
      token: 'USDC'
    }
    expect(getOfferingFormSummary(form, 2)).toMatchObject({
      defaultAmountLabel: '500 USDC',
      accessLabel: 'Whitelist · 2 lenders'
    })

    const offer = {
      access: 'general',
      cap: 500,
      remaining: 300,
      myDeposited: 200,
      token: USDC_ADDRESS
    } as LenderOffering
    expect(getLenderOfferingLimitsHint(offer)).toContain('300 USDC remaining')
  })

  it('derives whitelist allocation state and status metadata', () => {
    expect(
      getWhitelistAllocationSummary([{ username: 'A', address: TOKEN, amount: 600 }], 500, 'USDC')
    ).toMatchObject({ committedTotal: 600, status: 'over' })
    expect(isWhitelistAmountOverCap(600, 500)).toBe(true)
    expect(getFixedReturnStatusMeta('funded')).toEqual({ label: 'Funded', color: 'info' })
  })
})

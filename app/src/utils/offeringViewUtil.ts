import type { Address } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import type {
  FixedReturnLenderRow,
  FixedReturnOfferLender,
  LenderOffering,
  OfferingDisplayStatus,
  OfferingForm,
  OfferingFormSummary,
  OfferingProgressColor,
  OfferingRepaymentStatus,
  OfferingSummary,
  TermUnit,
  WhitelistAllocationSummary,
  WhitelistEntry
} from '@/types'
import {
  ACCESS_META,
  addTerm,
  formatOfferingTokenAmount,
  formatOfferingDate,
  maturityLabel,
  percentOf,
  sumWhitelistAmount
} from './offeringUtil'

export const OFFERING_TERM_PRESETS: Record<TermUnit, number[]> = {
  days: [30, 60, 90, 120],
  months: [6, 12, 18, 24],
  years: [1, 2, 3]
}

export const OFFERING_TERM_DEFAULTS: Record<TermUnit, number> = {
  days: 90,
  months: 12,
  years: 1
}

export const OFFERING_TERM_MAXIMUMS: Record<TermUnit, number> = {
  days: 365,
  months: 120,
  years: 30
}

export function getSupportedOfferingTokenOptions(addresses: Address[]) {
  return SUPPORTED_TOKENS.filter(
    (token) =>
      token.id !== 'native' &&
      addresses.some((address) => address.toLowerCase() === token.address.toLowerCase())
  ).map((token) => ({ label: token.symbol, value: token.symbol }))
}

export function getOfferingFormSummary(
  form: OfferingForm,
  whitelistCount: number
): OfferingFormSummary {
  return {
    defaultAmountLabel: form.capOn
      ? `${Math.round(form.cap).toLocaleString('en-US')} ${form.token}`
      : 'No cap',
    limitsLabel: form.capOn
      ? `Capped at ${Math.round(form.cap).toLocaleString('en-US')} ${form.token}`
      : 'No cap',
    accessLabel:
      form.access === 'whitelist' ? `Whitelist · ${whitelistCount} lenders` : 'General · anyone',
    accessDot: ACCESS_META[form.access].accessDot,
    deadlineFmt: formatOfferingDate(form.deadline),
    maturityFmt: maturityLabel(form.deadline, form.termValue, form.termUnit)
  }
}

export function getLenderOfferingLimitsHint(offer: LenderOffering): string {
  const { access, cap, remaining, myDeposited } = offer
  if (cap == null) {
    return `No per-lender cap. ${formatOfferingTokenAmount(remaining, offer.token)} remains available in this offering.`
  }
  const noun = access === 'whitelist' ? 'allocation' : 'cap'
  const personalRemaining = Math.max(cap - myDeposited, 0)
  const fundingLimitHint =
    remaining < personalRemaining
      ? ` Only ${formatOfferingTokenAmount(remaining, offer.token)} remains available in this offering.`
      : ''
  if (myDeposited > 0) {
    return `You've already lent ${formatOfferingTokenAmount(myDeposited, offer.token)} of your ${formatOfferingTokenAmount(cap, offer.token)} ${noun} — ${formatOfferingTokenAmount(personalRemaining, offer.token)} remaining.${fundingLimitHint}`
  }
  if (access === 'whitelist') {
    return `Your allocation of ${formatOfferingTokenAmount(cap, offer.token)} was set by the project admin.${fundingLimitHint}`
  }
  return `Maximum per lender: ${formatOfferingTokenAmount(cap, offer.token)}.${fundingLimitHint}`
}

export function getWhitelistAllocationSummary(
  whitelist: WhitelistEntry[],
  principalTarget: number,
  token?: string
): WhitelistAllocationSummary {
  const committedTotal = sumWhitelistAmount(whitelist)
  const status =
    committedTotal > principalTarget
      ? 'over'
      : whitelist.length > 0 && committedTotal < principalTarget
        ? 'under'
        : 'exact'
  const tokenLabel = token ?? ''
  const prefix = `Lenders allocated: ${committedTotal.toLocaleString('en-US')} / ${Math.round(principalTarget).toLocaleString('en-US')} ${tokenLabel}`

  if (status === 'over') {
    const excess = (committedTotal - principalTarget).toLocaleString('en-US')
    return {
      committedTotal,
      status,
      description: `${prefix} — exceeds target by ${excess} ${tokenLabel}`
    }
  }
  if (status === 'under') {
    const shortfall = (principalTarget - committedTotal).toLocaleString('en-US')
    return {
      committedTotal,
      status,
      description: `${prefix} — ${shortfall} ${tokenLabel} short of target; this offering can't reach its target through whitelisted lenders alone`
    }
  }
  return { committedTotal, status, description: prefix }
}

export function isWhitelistAmountOverCap(amount: number | null, cap: number | null): boolean {
  return cap != null && amount != null && amount > cap
}

export function getOfferingRepaymentStatus(
  paidRatio: number,
  pastMaturity: boolean
): OfferingRepaymentStatus {
  if (paidRatio >= 1) return 'completed'
  if (pastMaturity) return 'overdue'
  return paidRatio > 0 ? 'partial' : 'on-track'
}

export function getOfferingProgressColor(status: OfferingRepaymentStatus): OfferingProgressColor {
  if (status === 'overdue') return 'error'
  if (status === 'partial') return 'warning'
  return 'success'
}

export function isOfferingPastMaturity(
  startDate: string,
  term: number,
  termUnit: TermUnit,
  now = new Date()
): boolean {
  const start = new Date(`${startDate}T00:00:00`)
  if (isNaN(start.getTime())) return false
  return now.getTime() >= addTerm(start, term, termUnit).getTime()
}

interface BuildLenderRowsParams {
  lenders: FixedReturnOfferLender[]
  offering: OfferingSummary
  pastMaturity: boolean
  maturity: string
  resolveName: (address: Address) => string
}

export function buildFixedReturnLenderRows({
  lenders,
  offering,
  pastMaturity,
  maturity,
  resolveName
}: BuildLenderRowsParams): FixedReturnLenderRow[] {
  return lenders.map((lender) => {
    const paid =
      offering.raised > 0 ? (offering.totalRepaid * lender.principal) / offering.raised : 0
    const paidRatio = lender.expected > 0 ? paid / lender.expected : 0
    const status =
      lender.principal === 0 && offering.status === 'closed'
        ? 'refunded'
        : getOfferingRepaymentStatus(paidRatio, pastMaturity)
    const pct = percentOf(paid, lender.expected)

    return {
      name: resolveName(lender.address),
      address: lender.address,
      principal: lender.principal,
      principalFmt: formatOfferingTokenAmount(lender.principal, offering.token),
      rateFmt: offering.rate.toFixed(1) + '%',
      expectedFmt: formatOfferingTokenAmount(lender.expected, offering.token),
      paidFmt: formatOfferingTokenAmount(paid, offering.token),
      pctLabel: pct + '%',
      pct,
      progressColor: getOfferingProgressColor(status),
      maturityFmt: maturity,
      status
    }
  })
}

export function getOfferingDetailTotals(lenders: FixedReturnOfferLender[], totalPaid: number) {
  return {
    totalPrincipal: lenders.reduce((sum, lender) => sum + lender.principal, 0),
    totalExpected: lenders.reduce((sum, lender) => sum + lender.expected, 0),
    totalPaid
  }
}

export function getFixedReturnStatusMeta(status: OfferingDisplayStatus): {
  label: string
  color: 'success' | 'error' | 'warning' | 'info' | 'neutral'
} {
  const meta: Record<
    OfferingDisplayStatus,
    { label: string; color: 'success' | 'error' | 'warning' | 'info' | 'neutral' }
  > = {
    'on-track': { label: 'On track', color: 'success' },
    overdue: { label: 'Overdue', color: 'error' },
    completed: { label: 'Completed', color: 'success' },
    open: { label: 'Open', color: 'success' },
    funded: { label: 'Funded', color: 'info' },
    closed: { label: 'Closed', color: 'neutral' },
    partial: { label: 'In progress', color: 'warning' },
    refunded: { label: 'Refunded', color: 'neutral' }
  }
  return meta[status]
}

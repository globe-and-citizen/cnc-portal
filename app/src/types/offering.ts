import type { Address } from 'viem'

export type TermUnit = 'days' | 'months' | 'years'
export type OfferingAccess = 'general' | 'whitelist'
export type OfferingStateStatus = 'open' | 'funded' | 'closed'
export type OfferingRepaymentStatus = 'on-track' | 'overdue' | 'partial' | 'completed'
export type OfferingDisplayStatus = OfferingStateStatus | OfferingRepaymentStatus
export type OfferingProgressColor = 'error' | 'warning' | 'success'

export interface OfferingForm {
  title: string
  purpose: string
  principal: number
  rate: number
  termValue: number
  termUnit: TermUnit
  deadline: string
  access: OfferingAccess
  capOn: boolean
  cap: number
  token: string | undefined
}

export interface WhitelistEntry {
  username: string
  address: string
  amount: number | null
}

export interface OfferingSummary {
  id: string
  title: string
  rate: number
  term: number
  termUnit: TermUnit
  startDate: string
  deadlineTimestamp: number
  access: OfferingAccess
  raised: number
  target: number
  totalRepaid: number
  status: OfferingStateStatus
  token: Address
}

/**
 * Off-chain title/purpose metadata for a FixedReturn offer, as returned by
 * GET /api/fixed-return-offering — see backend/prisma/schema.prisma's
 * FixedReturnOffering model.
 */
export interface FixedReturnOfferingResponse {
  id: number
  teamId: number
  offerId: number
  title: string
  purpose: string | null
  createdAt: string
  updatedAt: string
}

/**
 * A FixedReturn offer from the lender's point of view — eligibility and the deposit
 * cap depend on the connected wallet, unlike OfferingSummary (issuer's view, the same
 * for everyone). There's no on-chain "minimum deposit" or "fixed amount" concept —
 * `cap` is either the General-mode per-lender lenderCap, the Whitelist-mode personal
 * allocation, or null (no cap, General mode with isCapEnabled false). `remaining` is
 * the amount the lender can currently submit: the smaller of their remaining personal
 * limit (when one exists) and the offer-wide room left before the funding target.
 */
export interface LenderOffering {
  id: string
  title: string
  rate: number
  term: number
  termUnit: TermUnit
  access: OfferingAccess
  allowed: boolean
  cap: number | null
  remaining: number
  myDeposited: number
  raised: number
  target: number
  token: Address
  accessLabel: string
  accessBg: string
  accessColor: string
  accessDot: string
  limitsLabel: string
  pct: number
}

/**
 * Matches FixedReturn.sol's `CreateOfferParams` struct field-for-field — the on-chain
 * args for `createLendingOffer`, derived from an `OfferingForm` via
 * `toFixedReturnOfferParams` in offeringUtil.ts.
 */
export interface FixedReturnOfferParams {
  token: Address
  fundingTarget: bigint
  interestRateBps: bigint
  termDuration: number
  termUnit: 0 | 1 | 2
  startDate: bigint
  subscriptionDeadline: bigint
  fundingAccess: 0 | 1
  isCapEnabled: boolean
  lenderCap: bigint
  whitelistAddrs: Address[]
  allocations: bigint[]
}

/** Raw shape decoded from FixedReturn.sol's getLendingOffer (named-tuple struct). */
export interface LendingOfferStruct {
  token: Address
  fundingTarget: bigint
  interestRateBps: bigint
  termDuration: number
  termUnit: 0 | 1 | 2
  startDate: bigint
  subscriptionDeadline: bigint
  fundingAccess: 0 | 1
  isCapEnabled: boolean
  lenderCap: bigint
  totalFunded: bigint
  totalRepaidByIssuer: bigint
  state: 0 | 1 | 2 | 3
}

/** A single FixedReturn offer as returned by useFixedReturnAllOffers. */
export interface FixedReturnRawOffer {
  offerId: number
  offer: LendingOfferStruct
  decimals: number
}

/** A single lender's position on one offer, as returned by useFixedReturnOfferLenders. */
export interface FixedReturnOfferLender {
  address: Address
  principal: number
  expected: number
}

/**
 * A connected lender's position (Whitelist allocation + cumulative deposits) on one
 * offer, as returned by useFixedReturnMyLenderPositions.
 */
export interface FixedReturnLenderPosition {
  allocation: bigint
  deposited: bigint
}

export interface FixedReturnLenderRow {
  name: string
  address: Address
  principal: number
  principalFmt: string
  rateFmt: string
  expectedFmt: string
  paidFmt: string
  pctLabel: string
  pct: number
  progressColor: OfferingProgressColor
  maturityFmt: string
  status: OfferingRepaymentStatus
}

export interface WhitelistAllocationSummary {
  committedTotal: number
  status: 'over' | 'under' | 'exact'
  description: string
}

export interface OfferingFormSummary {
  defaultAmountLabel: string
  limitsLabel: string
  accessLabel: string
  accessDot: string
  deadlineFmt: string
  maturityFmt: string
}

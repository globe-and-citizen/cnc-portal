import type { Address } from 'viem'

export type TermUnit = 'days' | 'months' | 'years'

export interface OfferingForm {
  title: string
  purpose: string
  principal: number
  rate: number
  termValue: number
  termUnit: TermUnit
  startDate: string
  deadline: string
  access: 'general' | 'whitelist'
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
  access: 'general' | 'whitelist'
  raised: number
  target: number
  totalRepaid: number
  status: 'open' | 'funded' | 'closed'
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
 * `cap` minus what this lender has already deposited (clamped at 0); null whenever
 * `cap` is null, since lendFunds enforces the cumulative total on-chain either way.
 */
export interface LenderOffering {
  id: string
  title: string
  rate: number
  term: number
  termUnit: TermUnit
  access: 'general' | 'whitelist'
  allowed: boolean
  cap: number | null
  remaining: number | null
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

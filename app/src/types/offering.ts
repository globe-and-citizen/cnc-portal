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

export interface LenderOffering {
  title: string
  rate: number
  term: number
  access: 'general' | 'whitelist'
  whitelisted?: boolean
  myAllocation?: number
  mode: 'range' | 'fixed'
  min?: number
  max?: number
  fixed?: number
  raised: number
  target: number
  allowed: boolean
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

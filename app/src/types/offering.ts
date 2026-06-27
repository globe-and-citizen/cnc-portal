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
  startDate: string
  access: 'general' | 'whitelist'
  raised: number
  target: number
  status: 'open' | 'funded' | 'closed'
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

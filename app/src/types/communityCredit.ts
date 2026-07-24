// Types for the Community Credit demo feature.
// Community Credit lets a company raise working capital from its members:
// each round is repaid in full with fixed interest at maturity, signed on-chain
// from a dedicated Credit Account. This module is fake-data only (no API yet).
// FixedReturn.sol is Community Credit's own contract — every on-chain shape below
// mirrors it directly.

import type { Address } from 'viem'
import type { UBadgeColor } from './ui'

export type CreditRole = 'owner' | 'lender'

/** Units offered for the Terms step's Term length picker (CreditOfferForm.termUnit) —
 *  the on-chain call no longer has an enum for this (FixedReturn.sol now stores an
 *  absolute maturityDate), but the wizard still collects value+unit for a friendlier
 *  input, converted to maturityDate via addCreditTerm at submission time. */
export type FixedReturnTermUnit = 'minutes' | 'days' | 'months' | 'years'

/** FixedReturn.sol's FundingAccess enum (General, Whitelist), as a string union. */
export type FixedReturnAccessMode = 'general' | 'whitelist'

/** A single whitelisted lender entry for a FixedReturn offer's CreateOfferParams. */
export interface FixedReturnWhitelistEntry {
  username: string
  address: string
  amount: number | null
}

/**
 * Matches FixedReturn.sol's `CreateOfferParams` struct field-for-field — the on-chain
 * args for `createLendingOffer`.
 */
export interface FixedReturnOfferParams {
  token: Address
  fundingTarget: bigint
  interestRateBps: bigint
  maturityDate: bigint
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
  maturityDate: bigint
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

// Mirrors FixedReturn.sol's OfferState (Open, Funded, Refundable, Repaying) resolved
// against the offer's deadline and repayment progress. 'active' = Repaying but not yet
// fully repaid; 'refunded' = deadline missed and the issuer already called
// refundLenders — on-chain, entering the Refundable state IS the refund (it pushes
// every lender's principal back in the same transaction), so this is a terminal state,
// never a pending one; 'stalled' = still contract-state Open but past its deadline
// without reaching target — the issuer hasn't yet chosen refundLenders or
// acceptPartialFunding; 'overdue' = Funded or Repaying, not yet fully repaid, past its
// maturity date (deadline + term) — purely a display flag (mirrors the old, since-
// removed FixedReturnView's isOfferingPastMaturity/'overdue' check). The contract has
// no on-chain maturity enforcement, so this never blocks or gates any action — repay
// still works exactly the same before or after maturity, this only changes the badge.
export type RoundStatus =
  | 'open'
  | 'stalled'
  | 'funded'
  | 'active'
  | 'overdue'
  | 'repaid'
  | 'refunded'

export type RoundDetailVariant = 'ledger' | 'gauge' | 'timeline' | 'repay'

export interface StatusMeta {
  label: string
  color: UBadgeColor
}

export type CreditAccess = 'everyone' | 'restricted'

/** Community Credit's own whitelist entry — same shape as a FixedReturnWhitelistEntry
 *  plus `custom`. A lender defaults to tracking the round-level cap live (amount stays
 *  in sync whenever the cap changes); `custom: true` means their amount was set
 *  independently and stops following further cap changes. */
export interface CreditWhitelistEntry extends FixedReturnWhitelistEntry {
  custom?: boolean
}

export interface CreditWhitelistAllocationSummary {
  committedTotal: number
  /** 'over' and 'exact' are both publishable — over-allocating is a deliberate buffer
   *  against a whitelisted lender who doesn't end up depositing. Only 'under' blocks
   *  publishing (FixedReturn.sol's AllocationSumBelowFundingTarget). */
  status: 'over' | 'under' | 'exact'
  description: string
}

/** Units offered for a custom term length — `minutes` matches the deadline's own
 *  minute-precision clock field, since `period`'s canonical unit is whole minutes. */
export type CreditTermUnit = 'minutes' | 'days' | 'weeks' | 'months' | 'years'

/** A member position inside a credit round. */
export interface CreditLender {
  name: string
  /** Shortened address, e.g. `0x91bE…07c2`. */
  addr: string
  /** Two comma-separated hex colors used to render the avatar gradient. */
  gradient: string
  amount: number
  /** Total owed at maturity — principal + interest, from FixedReturn's
   *  totalEntitlementOf. */
  expected: number
  /** Paid to this lender so far — proportional estimate (this lender's share of
   *  raised × the round's totalRepaid) rather than an extra per-lender contract read
   *  (totalPaidToLender exists on-chain but isn't called, for the same reason). */
  paid: number
  /** Short, human display date, e.g. `Jun 3`. */
  date: string
  /** True for the currently-connected user's position. */
  you?: boolean
  /** True once this lender's principal has been returned by refundLenders — `amount`
   *  reads live from lenderDeposits, which refundLenders zeroes per lender, so without
   *  this flag a refunded lender is indistinguishable from one who never lent. */
  refunded?: boolean
}

/** A single credit round (a "credit call"). */
export interface CreditRound {
  id: string
  name: string
  token: string
  target: number
  raised: number
  /** Cumulative amount the issuer has repaid so far, across all lenders. */
  totalRepaid: number
  /** Fixed interest rate over the whole term, in percent. */
  rate: number
  /** Term length in whole minutes — raw value, not for direct display. */
  period: number
  /** Display-ready term, e.g. `21 years, 10 months, 3 weeks, 4 days` — the calendar
   *  breakdown between the round's startDate and maturityDate (see `formatRoundTerm`),
   *  same treatment a custom wizard entry gets, computed once here since only this
   *  mapper has the raw on-chain instants the breakdown needs. */
  termLabel: string
  status: RoundStatus
  /** True only while `status === 'open'` — false once the round is `'stalled'` (or any
   *  later status), meaning lendFunds would revert. */
  fundable: boolean
  opened?: string
  deadline: string
  maturity: string
  repaidOn?: string
  restricted: boolean
  /** Maximum amount a single lender may contribute, or `null` for no cap. */
  cap: number | null
  desc: string
  lenders: CreditLender[]
}

/** A team member eligible to lend (used for the restricted whitelist picker). */
export interface CreditMember {
  id: string
  name: string
  addr: string
  gradient: string
}

/** Draft form state for the "New credit call" wizard. */
export interface CreditCallForm {
  name: string
  desc: string
  target: string
  token: string
  rate: string
  /** Term length resolved to whole minutes — the canonical value used downstream. */
  period: number
  /** Whether the term came from a preset chip or a custom value + unit. */
  periodMode: 'preset' | 'custom'
  /** Raw custom value (in `periodUnit`) before conversion to minutes. */
  periodVal: string
  periodUnit: CreditTermUnit
  deadline: string
  /** Clock time (HH:mm, UTC) paired with `deadline` — lets a round close at an exact
   *  minute rather than always end-of-day, e.g. for testing a deadline a few minutes out. */
  deadlineTime: string
  access: CreditAccess
  /** Searchable, per-lender custom-amount whitelist. */
  whitelist: CreditWhitelistEntry[]
  capOn: boolean
  cap: string
}

/**
 * The on-chain-ready shape a credit round's Basics/Terms/Access wizard fields resolve
 * to before being handed to toFixedReturnOfferParams — distinct from CreditCallForm,
 * which is the raw wizard state (string-typed fields, preset/custom period picker).
 */
export interface CreditOfferForm {
  title: string
  purpose: string
  principal: number
  rate: number
  termValue: number
  termUnit: FixedReturnTermUnit
  deadline: string
  deadlineTime: string
  access: FixedReturnAccessMode
  capOn: boolean
  cap: number
  token: string | undefined
}

/**
 * A FixedReturn offer from the lender's point of view — eligibility and the deposit
 * cap depend on the connected wallet. There's no on-chain "minimum deposit" or "fixed amount" concept —
 * `cap` is either the General-mode per-lender lenderCap, the Whitelist-mode personal
 * allocation, or null (no cap, General mode with isCapEnabled false). `remaining` is
 * the amount the lender can currently submit: the smaller of their remaining personal
 * limit (when one exists) and the offer-wide room left before the funding target.
 */
export interface CreditLenderOffering {
  id: string
  title: string
  rate: number
  access: FixedReturnAccessMode
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

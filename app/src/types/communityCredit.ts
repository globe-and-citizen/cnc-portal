// Types for the Community Credit demo feature.
// Community Credit lets a company raise working capital from its members:
// each round is repaid in full with fixed interest at maturity, signed on-chain
// from a dedicated Credit Account. This module is fake-data only (no API yet).

import type { WhitelistEntry } from './offering'
import type { UBadgeColor } from './ui'

export type CreditRole = 'owner' | 'lender'

// Mirrors FixedReturn.sol's OfferState (Open, Funded, Refundable, Repaying) resolved
// against the offer's deadline and repayment progress. 'active' = Repaying but not yet
// fully repaid; 'refundable' = deadline missed, lenders can claim their principal back;
// 'stalled' = still contract-state Open but past its deadline without reaching target —
// the issuer hasn't yet chosen refundLenders or acceptPartialFunding.
export type RoundStatus = 'open' | 'stalled' | 'funded' | 'active' | 'repaid' | 'refundable'

export type RoundDetailVariant = 'ledger' | 'gauge' | 'timeline' | 'repay'

export interface StatusMeta {
  label: string
  color: UBadgeColor
}

export type CreditAccess = 'everyone' | 'restricted'

/** Community Credit's own whitelist entry — same shape as Issue Note's WhitelistEntry
 *  plus `custom`. A lender defaults to tracking the round-level cap live (amount stays
 *  in sync whenever the cap changes); `custom: true` means their amount was set
 *  independently and stops following further cap changes. */
export interface CreditWhitelistEntry extends WhitelistEntry {
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

/** Units offered for a custom term length. The term is always stored in days. */
export type CreditTermUnit = 'days' | 'weeks' | 'months' | 'years'

/** A member position inside a credit round. */
export interface CreditLender {
  name: string
  /** Shortened address, e.g. `0x91bE…07c2`. */
  addr: string
  /** Two comma-separated hex colors used to render the avatar gradient. */
  gradient: string
  amount: number
  /** Total owed at maturity — principal + interest (mirrors Issue Note's "Expected
   *  return" column, from FixedReturn's totalEntitlementOf). */
  expected: number
  /** Paid to this lender so far — proportional estimate (this lender's share of
   *  raised × the round's totalRepaid), mirroring Issue Note's buildFixedReturnLenderRows
   *  rather than an extra per-lender contract read (totalPaidToLender exists on-chain but
   *  Issue Note doesn't call it either, for the same reason). */
  paid: number
  /** Short, human display date, e.g. `Jun 3`. */
  date: string
  /** True for the currently-connected user's position. */
  you?: boolean
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
  /** Term length in days. */
  period: number
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
  /** Term length resolved to whole days — the canonical value used downstream. */
  period: number
  /** Whether the term came from a preset chip or a custom value + unit. */
  periodMode: 'preset' | 'custom'
  /** Raw custom value (in `periodUnit`) before conversion to days. */
  periodVal: string
  periodUnit: CreditTermUnit
  deadline: string
  access: CreditAccess
  /** Searchable, per-lender custom-amount whitelist. */
  whitelist: CreditWhitelistEntry[]
  capOn: boolean
  cap: string
}

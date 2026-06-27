// Types for the Community Credit demo feature.
// Community Credit lets a company raise working capital from its members:
// each round is repaid in full with fixed interest at maturity, signed on-chain
// from a dedicated Credit Account. This module is fake-data only (no API yet).

export type CreditRole = 'owner' | 'lender'

export type RoundStatus = 'draft' | 'open' | 'funded' | 'active' | 'repaid'

export type RoundDetailVariant = 'ledger' | 'gauge' | 'timeline'

export type CreditAccess = 'everyone' | 'restricted'

/** A member position inside a credit round. */
export interface CreditLender {
  name: string
  /** Shortened address, e.g. `0x91bE…07c2`. */
  addr: string
  /** Two comma-separated hex colors used to render the avatar gradient. */
  gradient: string
  amount: number
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
  /** Fixed interest rate over the whole term, in percent. */
  rate: number
  /** Term length in days. */
  period: number
  status: RoundStatus
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
  period: number
  deadline: string
  access: CreditAccess
  whitelist: Record<string, boolean>
  capOn: boolean
  cap: string
}

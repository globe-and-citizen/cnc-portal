/**
 * Treasury aggregation types for the redesigned "Companies list" page.
 *
 * The `Team` model carries no balance data, so these shapes are populated from a
 * swappable balance source (see `@/composables/treasury/treasurySource`, a
 * deterministic PLACEHOLDER) and aggregated by `useTeamsTreasury`. See the spike
 * `docs/decisions/companies-treasury-aggregation.md`.
 */

/** On-chain account buckets a company's funds are spread across. */
export type AccountKey = 'Bank' | 'Safe' | 'Expense' | 'Cash'

/** Tokens a company's treasury can hold. */
export type TokenKey = 'POL' | 'USDC' | 'ETH' | 'SHER'

/**
 * One slice of a distribution (by account, token or company). `pct` values in a
 * set are rounded to sum to ~100; `color` is the slice's palette colour.
 */
export interface DistributionSegment {
  label: string
  pct: number
  valueUsd: number
  color: string
}

/** Relationship of the current user to a company. */
export type CompanyRole = 'owner' | 'employee'

/** Per-company treasury snapshot, ready for the card UI. */
export interface CompanyTreasury {
  teamId: string
  role: CompanyRole
  balanceUsd: number
  balanceLabel: string
  polApprox: number
  polLabel: string
  byAccount: DistributionSegment[]
  byToken: DistributionSegment[]
}

/** Cross-company roll-up powering the page hero / summary. */
export interface TreasuryAggregate {
  totalUsd: number
  totalLabel: string
  ownUsd: number
  ownLabel: string
  memberUsd: number
  memberLabel: string
  byCompany: DistributionSegment[]
  byToken: DistributionSegment[]
  byAccount: DistributionSegment[]
}

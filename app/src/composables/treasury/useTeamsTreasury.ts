import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import type { Team } from '@/types/team'
import type {
  CompanyRole,
  CompanyTreasury,
  DistributionSegment,
  TreasuryAggregate
} from '@/types/treasury'
import { useUserDataStore } from '@/stores/user'
import { fetchTeamTreasury } from './treasurySource'
import { ACCOUNT_COLORS, COMPANY_COLORS, TOKEN_COLORS } from './palette'

/** Fixed placeholder POL price (≈ $0.426) used to derive a POL-equivalent. */
export const POL_PRICE_USD = 0.426

/** Format a USD amount the way the cards/hero expect: `$1,234.56`. */
export function formatUsd(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Format a POL-equivalent amount: `≈ 2,896.7 POL`. */
export function formatPol(value: number): string {
  return '≈ ' + value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' POL'
}

/** A `{ label, valueUsd }` pair plus the colour to paint its slice. */
export interface SegmentInput {
  label: string
  valueUsd: number
  color: string
}

/**
 * Turn raw `{ label, valueUsd, color }` inputs into `DistributionSegment`s whose
 * `pct` values sum to ~100. The rounding drift is folded onto the largest slice
 * so the set lands on exactly 100 (when the total is non-zero). A zero total —
 * or an empty input — yields an empty segment list (callers guard for this).
 */
export function buildSegments(inputs: SegmentInput[]): DistributionSegment[] {
  const total = inputs.reduce((sum, input) => sum + input.valueUsd, 0)
  if (total <= 0) return []

  const segments = inputs.map((input) => ({
    label: input.label,
    valueUsd: input.valueUsd,
    color: input.color,
    pct: Math.round((input.valueUsd / total) * 100)
  }))

  // Fold the rounding drift onto the largest slice so the set sums to 100.
  const pctSum = segments.reduce((sum, segment) => sum + segment.pct, 0)
  const drift = 100 - pctSum
  if (drift !== 0 && segments.length > 0) {
    const largest = segments.reduce((max, segment) =>
      segment.valueUsd > max.valueUsd ? segment : max
    )
    largest.pct += drift
  }

  return segments
}

/** Derive the current user's role on a team from owner address equality. */
export function deriveRole(team: Team, userAddress?: string | null): CompanyRole {
  return team.ownerAddress?.toLowerCase() === userAddress?.toLowerCase() ? 'owner' : 'employee'
}

/** Build the full per-company treasury snapshot for one team. */
export function buildCompanyTreasury(team: Team, userAddress?: string | null): CompanyTreasury {
  const { accounts, tokens } = fetchTeamTreasury(team)
  const balanceUsd = accounts.reduce((sum, account) => sum + account.valueUsd, 0)
  const polApprox = balanceUsd / POL_PRICE_USD

  return {
    teamId: team.id,
    role: deriveRole(team, userAddress),
    balanceUsd,
    balanceLabel: formatUsd(balanceUsd),
    polApprox,
    polLabel: formatPol(polApprox),
    byAccount: buildSegments(
      accounts.map((account) => ({
        label: account.key,
        valueUsd: account.valueUsd,
        color: ACCOUNT_COLORS[account.key]
      }))
    ),
    byToken: buildSegments(
      tokens.map((token) => ({
        label: token.key,
        valueUsd: token.valueUsd,
        color: TOKEN_COLORS[token.key]
      }))
    )
  }
}

/** Sum `valueUsd` by key across companies, preserving first-seen order. */
function sumByKey(
  companies: CompanyTreasury[],
  pick: (company: CompanyTreasury) => DistributionSegment[]
): Map<string, { valueUsd: number; color: string }> {
  const totals = new Map<string, { valueUsd: number; color: string }>()
  for (const company of companies) {
    for (const segment of pick(company)) {
      const existing = totals.get(segment.label)
      if (existing) existing.valueUsd += segment.valueUsd
      else totals.set(segment.label, { valueUsd: segment.valueUsd, color: segment.color })
    }
  }
  return totals
}

/** Build the cross-company aggregate from already-computed per-company data. */
export function buildAggregate(
  companies: CompanyTreasury[],
  teamsById: Map<string, Team>
): TreasuryAggregate {
  const totalUsd = companies.reduce((sum, company) => sum + company.balanceUsd, 0)
  const ownUsd = companies
    .filter((company) => company.role === 'owner')
    .reduce((sum, company) => sum + company.balanceUsd, 0)
  const memberUsd = totalUsd - ownUsd

  const byCompany = buildSegments(
    companies.map((company, index) => ({
      label: teamsById.get(company.teamId)?.name ?? company.teamId,
      valueUsd: company.balanceUsd,
      color: COMPANY_COLORS[index % COMPANY_COLORS.length]!
    }))
  )

  const tokenTotals = sumByKey(companies, (company) => company.byToken)
  const accountTotals = sumByKey(companies, (company) => company.byAccount)

  const byToken = buildSegments(
    [...tokenTotals.entries()].map(([label, { valueUsd, color }]) => ({ label, valueUsd, color }))
  )
  const byAccount = buildSegments(
    [...accountTotals.entries()].map(([label, { valueUsd, color }]) => ({ label, valueUsd, color }))
  )

  return {
    totalUsd,
    totalLabel: formatUsd(totalUsd),
    ownUsd,
    ownLabel: formatUsd(ownUsd),
    memberUsd,
    memberLabel: formatUsd(memberUsd),
    byCompany,
    byToken,
    byAccount
  }
}

/**
 * Data layer for the companies treasury page: derives a per-company treasury
 * snapshot for each team plus a cross-company aggregate, all reactive to the
 * passed `teams` and the current user (for owner/employee role derivation).
 *
 * Balances come from a swappable PLACEHOLDER source (`fetchTeamTreasury`); see
 * `docs/decisions/companies-treasury-aggregation.md`.
 */
export function useTeamsTreasury(teams: MaybeRefOrGetter<Team[] | undefined>): {
  companies: ComputedRef<CompanyTreasury[]>
  byTeamId: ComputedRef<Record<string, CompanyTreasury>>
  aggregate: ComputedRef<TreasuryAggregate>
} {
  const userStore = useUserDataStore()

  const companies = computed<CompanyTreasury[]>(() =>
    (toValue(teams) ?? []).map((team) => buildCompanyTreasury(team, userStore.address))
  )

  const byTeamId = computed<Record<string, CompanyTreasury>>(() =>
    Object.fromEntries(companies.value.map((company) => [company.teamId, company]))
  )

  const aggregate = computed<TreasuryAggregate>(() => {
    const teamsById = new Map((toValue(teams) ?? []).map((team) => [team.id, team]))
    return buildAggregate(companies.value, teamsById)
  })

  return { companies, byTeamId, aggregate }
}

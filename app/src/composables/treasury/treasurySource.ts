// PLACEHOLDER source — see docs/decisions/companies-treasury-aggregation.md. Swap fetchTeamTreasury for the real backend/indexer reader.
import type { Team } from '@/types/team'
import type { AccountKey, TokenKey } from '@/types/treasury'
import { ACCOUNT_ORDER, TOKEN_ORDER } from './palette'

/** A single account balance, in USD, for one team. */
export interface TeamAccountBalance {
  key: AccountKey
  valueUsd: number
}

/** A single token balance, in USD, for one team. */
export interface TeamTokenBalance {
  key: TokenKey
  valueUsd: number
}

/** Raw treasury read for one team: per-account and per-token USD amounts. */
export interface TeamTreasurySnapshot {
  accounts: TeamAccountBalance[]
  tokens: TeamTokenBalance[]
}

/**
 * Deterministic 32-bit FNV-1a hash of a string. Used only to seed stable
 * placeholder balances — not security-sensitive.
 */
function hashId(id: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  // Force to an unsigned 32-bit integer.
  return hash >>> 0
}

/**
 * Mulberry32 PRNG seeded from `seed`. Deterministic and stable for a given
 * seed, so the same team id always yields the same placeholder balances.
 */
function makeRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * PLACEHOLDER balance reader. Produces a deterministic per-team treasury
 * snapshot derived solely from `team.id`, so the redesigned companies page has
 * stable, varied data to render until the real backend/indexer reader lands.
 *
 * Each team gets a base balance in roughly the $300–$13,000 range, split across
 * a deterministic subset of accounts and tokens. The split is stable per id.
 */
export function fetchTeamTreasury(team: Team): TeamTreasurySnapshot {
  const rng = makeRng(hashId(team.id))

  // Base treasury size for this team: ~$300 .. ~$13,000.
  const total = 300 + Math.floor(rng() * 12700)

  // Pick how many accounts/tokens this team uses (at least 2 each), keeping the
  // canonical display order so colours stay consistent across teams.
  const accountCount = 2 + Math.floor(rng() * (ACCOUNT_ORDER.length - 1))
  const tokenCount = 2 + Math.floor(rng() * (TOKEN_ORDER.length - 1))

  const accounts = splitTotal(ACCOUNT_ORDER.slice(0, accountCount), total, rng).map(
    ([key, valueUsd]) => ({ key, valueUsd })
  )
  const tokens = splitTotal(TOKEN_ORDER.slice(0, tokenCount), total, rng).map(
    ([key, valueUsd]) => ({
      key,
      valueUsd
    })
  )

  return { accounts, tokens }
}

/**
 * Split `total` USD across `keys` using deterministic random weights, rounding
 * to cents and assigning the rounding remainder to the first bucket so the
 * parts sum back to exactly `total`.
 */
function splitTotal<K extends string>(keys: K[], total: number, rng: () => number): [K, number][] {
  const weights = keys.map(() => rng() + 0.05)
  const weightSum = weights.reduce((sum, w) => sum + w, 0)

  const roundCents = (value: number): number => Math.round(value * 100) / 100
  const values = keys.map((_, i) => roundCents((total * weights[i]!) / weightSum))
  const assigned = values.reduce((sum, v) => sum + v, 0)
  // Push the rounding drift onto the first bucket so the split is exact.
  values[0] = roundCents(values[0]! + (total - assigned))

  return keys.map((key, i): [K, number] => [key, values[i]!])
}

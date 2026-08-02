import { describe, expect, it } from 'vitest'
import { fetchTeamTreasury } from '@/composables/treasury/treasurySource'
import { ACCOUNT_ORDER, TOKEN_ORDER } from '@/composables/treasury/palette'
import type { Team } from '@/types'

const team = (id: string) => ({ id }) as Team
const sumUsd = (parts: { valueUsd: number }[]) => parts.reduce((s, p) => s + p.valueUsd, 0)
const toCents = (n: number) => Math.round(n * 100)

// A spread of ids to exercise the varied account/token counts and the
// rounding-drift adjustment in splitTotal.
const IDS = ['1', '2', 'layer8', 'cnc', 'globe', 'sher', 'zzz', 'aXbYcZ', 'team-42', '']

describe('fetchTeamTreasury (placeholder source)', () => {
  it('returns per-account and per-token USD splits', () => {
    const snap = fetchTeamTreasury(team('layer8'))
    expect(snap.accounts.length).toBeGreaterThanOrEqual(2)
    expect(snap.tokens.length).toBeGreaterThanOrEqual(2)
  })

  it('is deterministic for a given team id', () => {
    expect(fetchTeamTreasury(team('cnc'))).toEqual(fetchTeamTreasury(team('cnc')))
  })

  it('produces different totals for different ids', () => {
    expect(toCents(sumUsd(fetchTeamTreasury(team('a')).accounts))).not.toBe(
      toCents(sumUsd(fetchTeamTreasury(team('bbbb')).accounts))
    )
  })

  it('keeps accounts and tokens summing to the same exact total, to the cent', () => {
    for (const id of IDS) {
      const snap = fetchTeamTreasury(team(id))
      expect(toCents(sumUsd(snap.accounts))).toBe(toCents(sumUsd(snap.tokens)))
      for (const part of [...snap.accounts, ...snap.tokens]) {
        expect(part.valueUsd).toBeGreaterThanOrEqual(0)
        // every amount is rounded to whole cents
        expect(Number.isInteger(toCents(part.valueUsd))).toBe(true)
      }
    }
  })

  it('uses the canonical key order with bounded counts', () => {
    for (const id of IDS) {
      const snap = fetchTeamTreasury(team(id))
      const accKeys = snap.accounts.map((a) => a.key)
      const tokKeys = snap.tokens.map((t) => t.key)
      expect(accKeys).toEqual(ACCOUNT_ORDER.slice(0, accKeys.length))
      expect(tokKeys).toEqual(TOKEN_ORDER.slice(0, tokKeys.length))
      expect(accKeys.length).toBeGreaterThanOrEqual(2)
      expect(accKeys.length).toBeLessThanOrEqual(ACCOUNT_ORDER.length)
      expect(tokKeys.length).toBeGreaterThanOrEqual(2)
      expect(tokKeys.length).toBeLessThanOrEqual(TOKEN_ORDER.length)
    }
  })
})

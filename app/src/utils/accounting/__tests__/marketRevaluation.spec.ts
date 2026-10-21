import { describe, expect, it } from 'vitest'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import { revaluationEntries, revaluationOf, safePositionsAt } from '../marketRevaluation'
import { presentTrial } from '../presenter'
import { drafts, history, TOKEN } from './safeExchangeFixtures'
import { usd } from './fixtures'
import type { JournalEntry } from '../types'

const journal = () => finalizeJournalEntryDrafts(drafts(history().slice(0, 3))).journal
const end = (entries: readonly JournalEntry[]) => Math.max(...entries.map((e) => e.timestamp))
const balanceOf = (entries: readonly JournalEntry[], name: string) =>
  entries
    .flatMap((entry) => entry.lines)
    .filter((line) => line.account.family.name === name)
    .reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n)

describe('Safe market revaluation', () => {
  it('[AC-US-ACCT-003-12] reads non-pegged Safe holdings at cost and values them at a market price', () => {
    const books = journal()
    const positions = safePositionsAt(books, end(books))
    expect(positions).toHaveLength(1)
    expect(positions[0]).toMatchObject({ quantity: 10000000000000000n, cost: usd(20) })
    expect(positions[0]!.asset?.address).toBe(TOKEN)
    expect(revaluationOf(positions, () => 1800)).toBe(-usd(2))
    expect(revaluationOf(positions, () => 0)).toBeNull()
    expect(safePositionsAt(books, 0)).toEqual([])
  })
  it('shows the Safe at market value in a balanced trial balance', () => {
    const books = journal()
    const at = end(books)
    const entries = revaluationEntries([{ timestamp: at, adjustment: -usd(2) }])
    const revalued = [...books, ...entries]
    expect(
      balanceOf(revalued, 'Cash — Safe') + balanceOf(revalued, 'Safe Market Value Adjustment')
    ).toBe(usd(18))
    expect(balanceOf(revalued, 'Unrealized P&L')).toBe(usd(2))
    const trial = presentTrial(revalued, new Date(at * 1000))
    expect(trial.balanced).toBe(true)
    expect(trial.rows.find((row) => row.label === 'Safe Market Value Adjustment')).toMatchObject({
      dr: '—',
      cr: '$2.00'
    })
    expect(trial.total).toBe('$22.00')
    expect(safePositionsAt(revalued, at)).toEqual(safePositionsAt(books, at))
  })
  it('shows a market gain with the adjustment as a debit and Unrealized P&L as a credit', () => {
    const books = journal()
    const at = end(books)
    const revalued = [...books, ...revaluationEntries([{ timestamp: at, adjustment: usd(5) }])]
    const trial = presentTrial(revalued, new Date(at * 1000))
    expect(trial.balanced).toBe(true)
    expect(trial.rows.find((row) => row.label === 'Safe Market Value Adjustment')).toMatchObject({
      dr: '$5.00',
      cr: '—'
    })
    expect(trial.rows.find((row) => row.label === 'Unrealized P&L')).toMatchObject({
      dr: '—',
      cr: '$5.00'
    })
    expect(trial.total).toBe('$25.00')
  })
  it('posts only each period’s change, so a later gain reverses an earlier loss', () => {
    const [opening, closing] = revaluationEntries([
      { timestamp: 200, adjustment: usd(3) },
      { timestamp: 100, adjustment: -usd(2) }
    ])
    expect(
      opening!.lines.map((line) => [line.account.family.name, line.debit, line.credit])
    ).toEqual([
      ['Unrealized P&L', usd(2), undefined],
      ['Safe Market Value Adjustment', undefined, usd(2)]
    ])
    expect(
      closing!.lines.map((line) => [line.account.family.name, line.debit, line.credit])
    ).toEqual([
      ['Safe Market Value Adjustment', usd(5), undefined],
      ['Unrealized P&L', undefined, usd(5)]
    ])
    expect(balanceOf([opening!, closing!], 'Safe Market Value Adjustment')).toBe(usd(3))
    expect(revaluationEntries([{ timestamp: 100, adjustment: 0n }])).toEqual([])
  })
})

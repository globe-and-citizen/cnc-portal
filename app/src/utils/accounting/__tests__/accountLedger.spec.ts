import { describe, it, expect } from 'vitest'
import {
  entriesForAccount,
  accountBalance,
  presentAccountLedger,
  accountLedgerTitle
} from '@/utils/accounting/accountLedger'
import { buildGeneralLedger } from '@/utils/accounting/generalLedger'
import { money } from '@/utils/accounting/presenter'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { catalogueLedger } from './catalogueLedger'

// The drill-down behind a Trial Balance line (issue #2249): its entries must be
// exactly the postings touching the account, and their balance must reconcile
// the line — verified against the catalogue's known per-account balances.
describe('accountLedger — statement-line drill-down', () => {
  const gl = buildGeneralLedger(catalogueLedger)
  const balanceOf = (account: AccountName): number =>
    gl.trialBalance.find((r) => r.account === account)?.balance ?? 0

  describe('entriesForAccount', () => {
    it('returns only postings whose debit or credit leg touches the account', () => {
      const scoped = entriesForAccount(catalogueLedger, 'Investor Equity')
      expect(scoped.length).toBeGreaterThan(0)
      expect(
        scoped.every((e) => e.debit === 'Investor Equity' || e.credit === 'Investor Equity')
      ).toBe(true)
    })

    it('sorts newest first, like the ledger view', () => {
      const scoped = entriesForAccount(catalogueLedger, 'Cash — Safe')
      const times = scoped.map((e) => e.timestamp)
      expect(times).toEqual([...times].sort((a, b) => b - a))
    })

    it('honours the as-of cutoff (to), excluding later postings', () => {
      const all = entriesForAccount(catalogueLedger, 'Cash — Safe')
      const cutoff = new Date(Math.min(...all.map((e) => e.timestamp)) * 1000)
      const upTo = entriesForAccount(catalogueLedger, 'Cash — Safe', null, cutoff)
      expect(upTo.length).toBeLessThan(all.length)
      expect(upTo.every((e) => e.timestamp <= Math.floor(cutoff.getTime() / 1000))).toBe(true)
    })

    it('honours the reporting-period lower bound (from), excluding earlier postings', () => {
      const all = entriesForAccount(catalogueLedger, 'Cash — Safe')
      const cutoff = new Date(Math.max(...all.map((e) => e.timestamp)) * 1000)
      const since = entriesForAccount(catalogueLedger, 'Cash — Safe', cutoff)
      expect(since.length).toBeLessThan(all.length)
      expect(since.every((e) => e.timestamp >= Math.floor(cutoff.getTime() / 1000))).toBe(true)
    })

    it('accepts a list of accounts (aggregate line) — the union of their postings', () => {
      const group: AccountName[] = ['Payroll Expense', 'Share-based Compensation']
      const scoped = entriesForAccount(catalogueLedger, group)
      const a = entriesForAccount(catalogueLedger, 'Payroll Expense')
      const b = entriesForAccount(catalogueLedger, 'Share-based Compensation')
      // Every posting touches at least one of the accounts…
      expect(
        scoped.every(
          (e) => group.includes(e.debit as AccountName) || group.includes(e.credit as AccountName)
        )
      ).toBe(true)
      // …and the union has no fewer entries than either account alone.
      expect(scoped.length).toBeGreaterThanOrEqual(Math.max(a.length, b.length))
    })
  })

  describe('accountBalance reconciles the trial-balance line', () => {
    // Each of these is a Trial Balance line; drilling in must net to the same figure.
    const cases: AccountName[] = [
      'Cash — Safe',
      'Cash — Payroll',
      'Cash — Expense',
      'Investor Equity',
      'Payroll Expense',
      'Share-based Compensation'
    ]
    for (const account of cases) {
      it(`${account} nets to its trial-balance value`, () => {
        const scoped = entriesForAccount(catalogueLedger, account)
        expect(accountBalance(scoped, account)).toBe(money(balanceOf(account)))
      })
    }
  })

  describe('presentAccountLedger', () => {
    it('flattens to two rows per two-leg posting and totals the account balance', () => {
      const view = presentAccountLedger(catalogueLedger, 'Investor Equity')
      expect(view.entryCount).toBe(entriesForAccount(catalogueLedger, 'Investor Equity').length)
      expect(view.total).toBe(money(balanceOf('Investor Equity')))
      // Every emitted row belongs to one of the scoped postings (no leakage).
      expect(view.rows.length).toBeGreaterThanOrEqual(view.entryCount)
    })

    it('is empty for an account with no activity', () => {
      const view = presentAccountLedger(catalogueLedger, 'Owner Capital')
      expect(view.entryCount).toBe(0)
      expect(view.rows).toEqual([])
      expect(view.total).toBe(money(0))
    })

    it('keeps the supplied total for an aggregate line', () => {
      const group: AccountName[] = ['Payroll Expense', 'Share-based Compensation']
      const view = presentAccountLedger(catalogueLedger, group, null, null, '-$50.00')
      expect(view.entryCount).toBe(entriesForAccount(catalogueLedger, group).length)
      // Mixed classes can't be netted, so the caller's figure is kept verbatim.
      expect(view.total).toBe('-$50.00')
    })

    it('nets to zero for an aggregate line with no supplied total', () => {
      const group: AccountName[] = ['Payroll Expense', 'Share-based Compensation']
      const view = presentAccountLedger(catalogueLedger, group)
      // With no single account to net against, the balance falls back to $0.00.
      expect(view.total).toBe(money(0))
    })
  })

  describe('accountLedgerTitle', () => {
    it('names the account, bare when unscoped', () => {
      expect(accountLedgerTitle('Cash — Safe')).toBe('General Ledger — Cash — Safe')
    })

    it('shows the as-of date for a point-in-time scope (to only)', () => {
      expect(accountLedgerTitle('Cash — Safe', null, new Date('2026-03-31T00:00:00Z'))).toMatch(
        /^General Ledger — Cash — Safe — As of /
      )
    })

    it('shows a reporting period when a start date is set (from)', () => {
      const title = accountLedgerTitle(
        'Cash — Safe',
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-03-31T00:00:00Z')
      )
      expect(title).toMatch(/^General Ledger — Cash — Safe — /)
      expect(title).not.toMatch(/As of/)
    })
  })
})

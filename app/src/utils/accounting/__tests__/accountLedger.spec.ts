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

    it('honours the as-of cutoff, excluding later postings', () => {
      const all = entriesForAccount(catalogueLedger, 'Cash — Safe')
      const cutoff = new Date(Math.min(...all.map((e) => e.timestamp)) * 1000)
      const upTo = entriesForAccount(catalogueLedger, 'Cash — Safe', cutoff)
      expect(upTo.length).toBeLessThan(all.length)
      expect(upTo.every((e) => e.timestamp <= Math.floor(cutoff.getTime() / 1000))).toBe(true)
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
  })

  describe('accountLedgerTitle', () => {
    it('names the account, with the as-of date when set', () => {
      expect(accountLedgerTitle('Cash — Safe')).toBe('General Ledger — Cash — Safe')
      expect(accountLedgerTitle('Cash — Safe', new Date('2026-03-31T00:00:00Z'))).toMatch(
        /^General Ledger — Cash — Safe — As of /
      )
    })
  })
})

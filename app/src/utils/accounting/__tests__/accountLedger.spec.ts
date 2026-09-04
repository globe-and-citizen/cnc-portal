import { describe, it, expect } from 'vitest'
import {
  entriesForAccount,
  accountBalance,
  accountNet,
  accountOpening,
  openingRow,
  withRunningBalance,
  NO_OPENING,
  presentAccountLedger,
  accountLedgerTitle
} from '@/utils/accounting/accountLedger'
import { buildGeneralLedger, buildJournal } from '@/utils/accounting/generalLedger'
import { ledgerRows } from '@/utils/accounting/ledgerPresenter'
import { money } from '@/utils/accounting/presenter'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { catalogueLedger } from './catalogueLedger'

// The drill-down behind a Trial Balance line (issue #2249): its entries must be
// exactly the postings touching the account, and their balance must reconcile
// the line — verified against the catalogue's known per-account balances.
describe('accountLedger — statement-line drill-down', () => {
  const gl = buildGeneralLedger(buildJournal(catalogueLedger))
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

    it('sorts oldest first, the reading order of a ledger', () => {
      const scoped = entriesForAccount(catalogueLedger, 'Cash — Safe')
      const times = scoped.map((e) => e.timestamp)
      expect(times).toEqual([...times].sort((a, b) => a - b))
    })

    it('scopes a drill-down to one pocket instance (each redeploy shows only its events)', () => {
      const bank1 = '0x1111111111111111111111111111111111111111'
      const bank2 = '0x2222222222222222222222222222222222222222'
      const dep = (
        id: string,
        instance: string
      ): import('@/utils/accounting/ledgerEntry').LedgerEntry => ({
        id,
        timestamp: Number(id),
        useCase: 'UC-BANK-02',
        debit: 'Cash — Bank',
        debitInstance: instance as `0x${string}`,
        credit: 'Service Revenue',
        amountUsd: 10,
        token: 'usdc',
        rawAmount: '10000000',
        internal: false,
        memo: '',
        enrichment: 'not-applicable'
      })
      // A blank-instance Bank leg (a FixedReturn sweep) is a separate unresolved account.
      const blank = {
        ...dep('4', bank1),
        debitInstance: undefined,
        useCase: 'UC-CREDIT-01' as const
      }
      const feed = [dep('1', bank1), dep('2', bank2), dep('3', bank1), blank]

      const onBank2 = entriesForAccount(feed, 'Cash — Bank', null, null, { instance: bank2 })
      expect(onBank2.map((e) => e.id)).toEqual(['2']) // only the second deployment's event

      // A resolved deployment includes only legs whose source contract matches it.
      const onBank1 = entriesForAccount(feed, 'Cash — Bank', null, null, {
        instance: bank1
      })
      expect(onBank1.map((e) => e.id).sort()).toEqual(['1', '3'])

      const unresolved = entriesForAccount(feed, 'Cash — Bank', null, null, { unresolved: true })
      expect(unresolved.map((e) => e.id)).toEqual(['4'])
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
      const group: AccountName[] = ['Payroll Expense', 'Deferred SHER Compensation']
      const scoped = entriesForAccount(catalogueLedger, group)
      const a = entriesForAccount(catalogueLedger, 'Payroll Expense')
      const b = entriesForAccount(catalogueLedger, 'Deferred SHER Compensation')
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
      'Deferred SHER Compensation'
    ]
    for (const account of cases) {
      it(`${account} nets to its trial-balance value`, () => {
        const scoped = entriesForAccount(catalogueLedger, account)
        expect(accountBalance(scoped, account)).toBe(money(balanceOf(account)))
      })
    }
  })

  // The per-line "Balance" column of a drill-down: the account's own rows carry
  // the balance it stands at once that posting is booked, ending on the figure
  // the ledger is left with.
  describe('withRunningBalance', () => {
    const account: AccountName = 'Cash — Safe'
    const scoped = entriesForAccount(catalogueLedger, account)
    const cash = (cell: string): number => Number(cell.replace(/[$,]/g, '') || 0)
    const annotate = (entries = scoped, opening = 0) =>
      withRunningBalance(ledgerRows(entries), account, opening)

    it('opens on the first posting alone when nothing is carried in', () => {
      const balances = annotate().filter((r) => r.balance)
      expect(balances.length).toBeGreaterThan(1)
      const first = balances[0]!
      expect(first.balance).toBe(money(cash(first.dr) - cash(first.cr)))
    })

    it('lands the last row on the account balance', () => {
      const balances = annotate().filter((r) => r.balance)
      expect(balances[balances.length - 1]!.balance).toBe(accountBalance(scoped, account))
      expect(balances[balances.length - 1]!.balance).toBe(money(balanceOf(account)))
    })

    it('carries an opening balance into the first row', () => {
      const plain = annotate().filter((r) => r.balance)
      const carried = annotate(scoped, 1000).filter((r) => r.balance)
      expect(carried[0]!.balance).toBe(money(cash(plain[0]!.balance!) + 1000))
      expect(carried[carried.length - 1]!.balance).toBe(money(balanceOf(account) + 1000))
    })

    it('leaves the facing leg of a posting without a balance', () => {
      const rows = annotate()
      expect(rows.some((r) => r.account !== account)).toBe(true)
      expect(rows.filter((r) => r.account !== account).every((r) => r.balance === undefined)).toBe(
        true
      )
    })

    it('runs a page seeded from the entries above it, continuing the same walk', () => {
      const pageSize = 2
      const full = annotate().filter((r) => r.balance)
      // Page two opens on what the entries already listed left behind.
      const page = withRunningBalance(
        ledgerRows(scoped.slice(pageSize, pageSize * 2)),
        account,
        accountNet(scoped.slice(0, pageSize), account)
      ).filter((r) => r.balance)
      expect(page[0]!.balance).toBe(full[pageSize]!.balance)
    })

    it('counts a credit-normal account the other way round', () => {
      const equity: AccountName = 'Investor Equity'
      const entries = entriesForAccount(catalogueLedger, equity)
      const rows = withRunningBalance(ledgerRows(entries), equity, 0).filter((r) => r.balance)
      // Equity is credited: its balance grows with the credit column.
      expect(rows[0]!.balance).toBe(money(cash(rows[0]!.cr)))
      expect(rows[rows.length - 1]!.balance).toBe(money(balanceOf(equity)))
    })
  })

  // The "Opening balance" line heading an account's ledger (Odoo's "solde initial").
  describe('accountOpening / openingRow', () => {
    const account: AccountName = 'Cash — Safe'
    const scoped = entriesForAccount(catalogueLedger, account)

    it('carries nothing into an open-ended window', () => {
      expect(accountOpening(catalogueLedger, account, null)).toEqual(NO_OPENING)
      expect(accountOpening(catalogueLedger, '', new Date())).toEqual(NO_OPENING)
    })

    it('sums everything booked before the window opens', () => {
      // A window opening after the first posting leaves that posting behind it.
      const from = new Date((scoped[1]!.timestamp + 1) * 1000)
      const opening = accountOpening(catalogueLedger, account, from)
      const prior = entriesForAccount(catalogueLedger, account, null, new Date(+from - 1000))

      expect(prior.length).toBeGreaterThan(0)
      expect(opening.balance).toBe(accountNet(prior, account))
      expect(opening.debits).toBe(
        prior.filter((e) => e.debit === account).reduce((sum, e) => sum + e.amountUsd, 0)
      )
      // Opening + the window's own movements is still the all-time balance.
      const within = entriesForAccount(catalogueLedger, account, from)
      expect(money(opening.balance + accountNet(within, account))).toBe(money(balanceOf(account)))
    })

    it('heads the ledger with a dateless, actionless line', () => {
      const row = openingRow({ debits: 12, credits: 4, balance: 8 })
      expect(row.label).toBe('Opening balance')
      expect(row.balance).toBe(money(8))
      expect(row.dr).toBe(money(12))
      expect(row.cr).toBe(money(4))
      expect(row.date).toBe('')
      expect(row.category).toBe('')
    })
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
      const group: AccountName[] = ['Payroll Expense', 'Deferred SHER Compensation']
      const view = presentAccountLedger(catalogueLedger, group, null, null, '-$50.00')
      expect(view.entryCount).toBe(entriesForAccount(catalogueLedger, group).length)
      // Mixed classes can't be netted, so the caller's figure is kept verbatim.
      expect(view.total).toBe('-$50.00')
    })

    it('nets to zero for an aggregate line with no supplied total', () => {
      const group: AccountName[] = ['Payroll Expense', 'Deferred SHER Compensation']
      const view = presentAccountLedger(catalogueLedger, group)
      // With no single account to net against, the balance falls back to $0.00.
      expect(view.total).toBe(money(0))
    })

    it('folds a Bank fee into its transfer, like the general ledger (issue: drill-down parity)', () => {
      type Entry = import('@/utils/accounting/ledgerEntry').LedgerEntry
      const transfer: Entry = {
        id: '0xabc-5',
        timestamp: 100,
        useCase: 'UC-BANK-03',
        debit: 'Cash — Payroll',
        credit: 'Cash — Bank',
        amountUsd: 2,
        token: 'usdc',
        rawAmount: '2000000',
        rate: 1,
        internal: true,
        memo: 'Fund Cash — Payroll from Bank',
        enrichment: 'not-applicable'
      }
      const fee: Entry = {
        id: '0xabc-3',
        timestamp: 100,
        useCase: 'FEE',
        debit: 'Transaction Fee Expense',
        credit: 'Cash — Bank',
        amountUsd: 0.5,
        token: 'usdc',
        rawAmount: '500000',
        rate: 1,
        internal: false,
        memo: 'Transaction fee skimmed from Bank',
        enrichment: 'not-applicable'
      }
      const view = presentAccountLedger([transfer, fee], 'Cash — Bank')
      // One compound entry of three lines, not two separate postings.
      expect(view.entryCount).toBe(1)
      expect(view.rows.map((r) => r.account)).toEqual([
        'Cash — Payroll',
        'Transaction Fee Expense',
        'Cash — Bank'
      ])
      // The account still nets to the gross it lost — the fold changes only display.
      expect(view.total).toBe(money(-2.5))
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

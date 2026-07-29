/**
 * General-ledger presentation transform: fold a lender's Community Credit legs
 * into a **single compound posting**, so a round reads the way the reference
 * borrowing workbook writes it — one entry per lender, naming what they put in
 * and what they are owed, rather than a deposit and an anonymous fee sitting
 * apart in the journal.
 *
 * Two groups, both keyed on the round + the lender (`creditOfferId` +
 * `counterparty`), so two rounds the same member lent into never merge:
 *   - **funding** — the deposit (`UC-CREDIT-01`) and the fixed return recognised
 *     when the round closed (`UC-CREDIT-05`).
 *   - **repayment** — the principal and interest legs of one `LenderRepaid`
 *     (`UC-CREDIT-03`), which also share a timestamp; two lenders repaid in the
 *     same transaction stay apart because their counterparties differ.
 *
 * One rendering rule covers both shapes: **itemize the debits, aggregate each
 * credit account once**. Funding credits two different accounts, so it lands on
 * four lines (Dr Cash — Credit · Cr Loan Payable · Dr Interest Expense ·
 * Cr Interest Payable); repayment credits `Cash — Bank` twice, so the two debits
 * collapse onto one cash line and it lands on three (Dr Loan Payable ·
 * Dr Interest Payable · Cr Cash — Bank, gross).
 *
 * Presentation-only: the canonical entries — and the statements they feed — are
 * untouched, each keeping its own date and amount. Mirrors {@link ./payrollGrouping}.
 */
import { money } from './presenter'
import { withInterestTail } from './describeEntry'
import type { LedgerEntry } from './ledgerEntry'
import type { LedgerRow } from './ledgerPresenter'

/** The empty activity carried by a compound posting's continuation rows. */
const NO_ACTIVITY: LedgerRow['activity'] = { kind: 'plain', text: '' }

/**
 * Entries that fold into one compound credit posting share this key; `null` for
 * anything that always stands alone. A leg with no round or no lender on it
 * cannot be attributed, so it is left as its own posting.
 */
export function creditGroupKey(entry: LedgerEntry): string | null {
  const round = entry.creditOfferId
  const lender = entry.counterparty
  if (!round || !lender) return null
  switch (entry.useCase) {
    case 'UC-CREDIT-01':
    case 'UC-CREDIT-05':
      return `credit-funded|${round}|${lender}`
    case 'UC-CREDIT-03':
      // Installments are separate events, so the timestamp keeps them apart.
      return `credit-repaid|${round}|${lender}|${entry.timestamp}`
    default:
      return null
  }
}

/**
 * Sort rank inside a group, so the posting leads with the entry that names it:
 * the principal — the deposit made, or the principal repaid — before the fixed
 * return that rides along with it. That lead entry also gives the compound its
 * date, its Action badge and its Transaction label.
 */
function legRank(entry: LedgerEntry): number {
  return entry.useCase === 'UC-CREDIT-05' || entry.debit === 'Interest Payable' ? 1 : 0
}

/** The fixed return inside a group — what the lead row's narration mentions. */
function interestUsd(group: readonly LedgerEntry[]): number {
  return group.reduce((sum, e) => sum + (legRank(e) === 1 ? e.amountUsd : 0), 0)
}

/**
 * Render a lender's credit group as one compound posting: every debit itemized
 * with its own movement columns, then one aggregated credit row per credit
 * account, in the order the accounts first appear. The lead row keeps the Date /
 * Action / Transaction head with its Activity extended by the interest; every
 * following row renders head-less.
 *
 * `rowsOf` is injected (rather than imported) so this module needs no runtime
 * dependency on the presenter — only its `LedgerRow` type.
 */
export function compoundCreditRows(
  group: readonly LedgerEntry[],
  rowsOf: (entry: LedgerEntry) => LedgerRow[]
): LedgerRow[] {
  const order: string[] = []
  const byCredit = new Map<string, LedgerEntry[]>()
  for (const entry of [...group].sort((a, b) => legRank(a) - legRank(b))) {
    const key = entry.credit ?? ''
    const bucket = byCredit.get(key)
    if (bucket) bucket.push(entry)
    else {
      byCredit.set(key, [entry])
      order.push(key)
    }
  }

  const rows: LedgerRow[] = []
  for (const key of order) {
    const legs = byCredit.get(key)!
    for (const entry of legs) {
      const [debitRow] = rowsOf(entry) // itemized debit (with movement)
      if (debitRow) rows.push(debitRow)
    }
    const creditRow = rowsOf(legs[0]!)[1]
    if (creditRow) {
      const sum = legs.reduce((total, entry) => total + entry.amountUsd, 0)
      rows.push({ ...creditRow, cr: money(sum) }) // one aggregated credit
    }
  }

  const interest = interestUsd(group)
  return rows.map((row, i) =>
    i === 0
      ? { ...row, activity: withInterestTail(row.activity, interest) }
      : {
          ...row,
          isFirst: false,
          date: '',
          label: '',
          activity: NO_ACTIVITY,
          cat: '',
          catClass: ''
        }
  )
}

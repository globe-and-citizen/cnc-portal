/**
 * Which ledger entries the classification UI may act on (issue #2457).
 *
 * The Bank/Safe mappers turn an external deposit/withdrawal into a single balanced
 * posting; those are the entries a team owner can reclassify. This pure helper reads
 * a consolidated {@link LedgerEntry} back and, for such an entry, returns its
 * direction and cash pocket so the UI can render a control and resolve the allowed
 * categories. Everything else — fees, internal pocket-to-pocket moves, payroll and
 * expense payouts, dividends, share mints — returns `null`.
 *
 * A guaranteed-internal move (`internal === true`) is intentionally excluded: it is
 * provably a transfer between the team's own pockets and cannot be reclassified into
 * income or expense, so no control is offered for it.
 */
import type { LedgerEntry, UseCase } from './ledgerEntry'
import type { AccountName } from './chartOfAccounts'
import type { ClassificationDirection } from './classification'

/** The Bank/Safe cash pockets a classifiable move touches. */
const CASH_POCKETS: ReadonlySet<AccountName> = new Set<AccountName>(['Cash — Bank', 'Cash — Safe'])

/**
 * Use cases the Bank/Safe mappers emit for an **external** deposit/withdrawal —
 * founder/client inflows, an unclassified outflow, and the two `CASH-IN`/`CASH-OUT`
 * codes a manual classification stamps. Fees, dividends and internal moves are absent.
 */
const CLASSIFIABLE_USE_CASES: ReadonlySet<UseCase> = new Set<UseCase>([
  'UC-BANK-01',
  'UC-BANK-02',
  'CASH-IN',
  'CASH-OUT'
])

export interface ClassificationTarget {
  direction: ClassificationDirection
  /** The Bank/Safe cash pocket the money moved through. */
  cashAccount: AccountName
}

/**
 * The classification target of a ledger entry, or `null` when it is not a
 * manually-classifiable Bank/Safe deposit/withdrawal. An entry already carrying a
 * manual `classified` category always qualifies (so it stays editable); otherwise it
 * must be an external Bank/Safe move with exactly one cash-pocket leg.
 */
export function classificationTargetOf(entry: LedgerEntry): ClassificationTarget | null {
  if (entry.internal) return null
  if (entry.classified == null && !CLASSIFIABLE_USE_CASES.has(entry.useCase)) return null

  const debitCash = entry.debit != null && CASH_POCKETS.has(entry.debit)
  const creditCash = entry.credit != null && CASH_POCKETS.has(entry.credit)
  if (debitCash && !creditCash) return { direction: 'in', cashAccount: entry.debit as AccountName }
  if (creditCash && !debitCash)
    return { direction: 'out', cashAccount: entry.credit as AccountName }
  return null
}

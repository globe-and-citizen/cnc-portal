/**
 * Where a ledger posting actually happened — the portal section a reader should
 * land on when they click its "Activity" narration.
 *
 * The general ledger tells you *what* the company did ("Alice withdrew $0.30 for
 * an expense"); this module says *where* to go and see it — the Expense Account,
 * the payroll history, the credit round. It is the routing counterpart of
 * {@link ./describeEntry}, and stays just as pure: it names a **section**, never
 * a URL, because the team id (and the Safe's address) are runtime concerns the
 * `useActivityDestination` composable fills in at render time.
 *
 * Resolution is two-step:
 *  1. the use cases that own a dedicated surface — payroll, community credit,
 *     share issuance — are mapped explicitly;
 *  2. everything else follows the **cash pocket** the money moved through, taking
 *     the credited (source) leg first, since that is the pocket the move was made
 *     from, then the debited one.
 *
 * An entry that touches no team surface (a pure accrual, a FeeCollector-only leg)
 * resolves to `null` and its Activity stays plain text.
 */
import type { LedgerEntry } from './ledgerEntry'
import type { AccountName } from './chartOfAccounts'

/** A portal surface the ledger can send a reader to. */
export type LedgerSection =
  | 'bank'
  | 'safe'
  | 'expense'
  | 'payroll'
  | 'payroll-history'
  | 'community-credit'
  | 'credit-round'
  | 'sher-token'
  | 'vesting'

export interface ActivityDestination {
  section: LedgerSection
  /** Whose payroll history to open — `payroll-history` only. */
  memberAddress?: string
  /** Which Community Credit round to open — `credit-round` only. */
  roundId?: string
  /** What the link promises, shown as the cell's tooltip and its accessible name. */
  label: string
}

/** The tooltip each section reads as — a sentence, so it needs no assembly. */
const SECTION_LABEL: Record<LedgerSection, string> = {
  bank: 'Open the Bank Account',
  safe: 'Open the Safe Account',
  expense: 'Open the Expense Account',
  payroll: 'Open the Payroll Account',
  'payroll-history': 'Open the payroll history',
  'community-credit': 'Open Community Credit',
  'credit-round': 'Open the credit round',
  'sher-token': 'Open the SHER Token page',
  vesting: 'Open the Vesting page'
}

/**
 * The section a cash pocket belongs to. `Cash — FeeCollector` is deliberately
 * absent: the FeeCollector is protocol-wide, not a team surface, so a fee leg
 * follows the pocket it left instead.
 */
const POCKET_SECTION: Partial<Record<AccountName, LedgerSection>> = {
  'Cash — Bank': 'bank',
  'Cash — Safe': 'safe',
  'Cash — Payroll': 'payroll',
  'Cash — Expense': 'expense',
  'Cash — Credit': 'community-credit'
}

/** Build a destination, attaching the section's tooltip. */
function to(
  section: LedgerSection,
  extra: Omit<ActivityDestination, 'section' | 'label'> = {}
): ActivityDestination {
  return { section, label: SECTION_LABEL[section], ...extra }
}

/**
 * The surface a use case owns outright, whatever accounts its legs touch — a
 * wage belongs to payroll even though it credits Cash — Payroll, and a credit
 * leg belongs to its round rather than to the generic pocket.
 */
function sectionOfUseCase(entry: LedgerEntry): ActivityDestination | null {
  switch (entry.useCase) {
    case 'UC-CASH-02':
    case 'UC-CASH-03':
      // A wage names the member it belongs to, so it opens their own history;
      // without one there is nothing to scope to, so the pocket answers instead.
      return entry.counterparty
        ? to('payroll-history', { memberAddress: entry.counterparty })
        : to('payroll')
    case 'UC-CREDIT-01':
    case 'UC-CREDIT-02':
    case 'UC-CREDIT-03':
    case 'UC-CREDIT-04':
    case 'UC-CREDIT-05':
      return entry.creditOfferId
        ? to('credit-round', { roundId: entry.creditOfferId })
        : to('community-credit')
    case 'DEFAULT-D':
    case 'UC-INV-01':
      return to('sher-token')
    case 'UC-VEST-01':
    case 'UC-VEST-02':
    case 'UC-VEST-03':
      return to('vesting')
    default:
      return null
  }
}

/** The section of the pocket the money moved through — source leg first. */
function sectionOfPocket(entry: LedgerEntry): ActivityDestination | null {
  const section =
    (entry.credit && POCKET_SECTION[entry.credit]) || (entry.debit && POCKET_SECTION[entry.debit])
  return section ? to(section) : null
}

/**
 * Where the reader should be sent to see a posting happen, or `null` when the
 * entry has no portal surface of its own.
 */
export function activityDestinationOf(entry: LedgerEntry): ActivityDestination | null {
  return sectionOfUseCase(entry) ?? sectionOfPocket(entry)
}

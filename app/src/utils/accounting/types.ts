/**
 * Shared Accounting domain contracts.
 *
 * This module owns stable values exchanged across the journal, account registry,
 * and report projections. Types that describe one mapper, export adapter,
 * composable, or presentation implementation stay with that implementation.
 * Keep every import here type-only so this remains an acyclic runtime boundary.
 */
import type { Address } from 'viem'
import type { TokenId } from '@/constant'
import type { AccountFamily, AccountName } from './chartOfAccounts'
import type { LedgerEntry, UseCase } from './ledgerEntry'

/** USD amount scaled by the canonical Accounting amount precision. */
export type UsdAmount = bigint

/** USD-per-token rate scaled by the canonical Accounting rate precision. */
export type UsdRate = bigint

/** Stable identity of one concrete account in the books. */
export type AccountId = string

/** Whether a deployment-specific account could be resolved from source evidence. */
type AccountResolution = 'resolved' | 'unresolved'

/** One actual account that a journal line can post to. */
export interface Account {
  /** Stable key used by journal lines and report roll-ups. */
  id: AccountId
  /** The shared family that supplies this account's class and normal side. */
  family: AccountFamily
  /** The authoritative contract identity for a deployment-specific account. */
  contractAddress?: Address
  /** `unresolved` means source evidence did not identify a concrete deployment. */
  resolution: AccountResolution
}

/** The single source of concrete account resolution for one assembled book. */
export interface AccountRegistry {
  /** All concrete accounts touched by the assembled book, in chart order. */
  accounts: readonly Account[]
  /** Resolve one chart family and optional contract address to its concrete account. */
  resolve(family: AccountName, contractAddress?: string | null): Account
  /** Read a concrete account by its stable identity. */
  get(id: AccountId): Account | undefined
}

/** The token movement evidenced by one monetary journal line. */
interface JournalEntryLineMovement {
  /** Token transferred on the source operation. */
  token: TokenId
  /** Token base units transferred on the source operation. */
  rawAmount: bigint
  /** Decimal places used by the token's base unit. */
  decimals: number
  /** USD-per-whole-token rate of record used to value this movement. */
  rate: UsdRate
}

/** One ordered debit or credit line belonging to a JournalEntry. */
export type JournalEntryLine =
  | {
      /** Stable within-entry line identity. */
      id: string
      /** Canonical concrete account, including its identity, family and resolution. */
      account: Account
      /** Token-level movement evidence for the line's display projection. */
      movement?: JournalEntryLineMovement
      debit: UsdAmount
      credit?: never
    }
  | {
      /** Stable within-entry line identity. */
      id: string
      /** Canonical concrete account, including its identity, family and resolution. */
      account: Account
      /** Token-level movement evidence for the line's display projection. */
      movement?: JournalEntryLineMovement
      debit?: never
      credit: UsdAmount
    }

/** One complete and balanced Accounting operation. */
export interface JournalEntry {
  /** Stable journal-entry identity. One source operation produces one journal entry. */
  id: string
  /** Stable identity of the source accounting operation behind this entry. */
  sourceOperationId: string
  /** Event time, Unix seconds. */
  timestamp: number
  /** The journal template the source operation realised. */
  useCase: UseCase
  /** Human-readable narration. */
  memo: string
  /** True when both legs are CNC-owned pockets (internal move, no IS impact). */
  internal: boolean
  /** Whether this entry carries monetary lines or only memo metadata. */
  kind: 'monetary' | 'memo'
  /** Off-chain category, when enriched (e.g. "Payroll", "Operating"). */
  category?: string
  /** Transaction hash, when known. */
  txHash?: string
  /** Contextual source snapshot used for narration and drill-down links. */
  source?: LedgerEntry
  /** Optional owner workflow for the entry's assignable counter-account line. */
  accountAssignment?: {
    /** False for compound operations, which remain visible but read-only. */
    editable: boolean
    /** The selected account is already applied to the authoritative journal line. */
    accountId?: AccountId
    /** Optional owner note stored with the assignment. */
    memo?: string
  }
  /** Ordered and validated journal lines; empty only when kind is `memo`. */
  lines: JournalEntryLine[]
}

/** Summary metrics projected from canonical JournalEntry lines. */
export interface AccountingSummary {
  /** Net cash across every company cash pocket. */
  cash: UsdAmount
  /** Income-account total. */
  income: UsdAmount
  /** Expense-account total. */
  expense: UsdAmount
  /** Transaction Fee Expense, a subset of expense. */
  transactionFees: UsdAmount
  /** Principal and interest returned to Community Credit lenders. */
  debtRepaid: UsdAmount
  /** Contributed owner and investor capital, excluding retained earnings. */
  equity: UsdAmount
}

/** One account total in the Income Statement. */
export interface StatementLine {
  account: AccountName
  amount: UsdAmount
}

/** Income Statement projected from the canonical journal. */
export interface IncomeStatement {
  /** Income accounts with non-zero activity (revenue + gains). */
  revenue: StatementLine[]
  /** Expense accounts with non-zero activity (costs + losses). */
  expenses: StatementLine[]
  totalRevenue: UsdAmount
  totalExpenses: UsdAmount
  /** totalRevenue − totalExpenses. */
  netIncome: UsdAmount
}

/** One concrete account shared with the as-of Trial Balance projection. */
interface BalanceSheetAccountLine {
  account: Account
  accountLabel: string
  /** The account's balance on its normal side, matching the Trial Balance. */
  balance: UsdAmount
  /** Signed contribution to its Balance Sheet section. */
  contribution: UsdAmount
}

/** Balance Sheet projected from concrete Accounts in the canonical journal. */
export interface BalanceSheet {
  assets: BalanceSheetAccountLine[]
  liabilities: BalanceSheetAccountLine[]
  /** Equity and contra-equity accounts; contra-equity contributions are negative. */
  equity: BalanceSheetAccountLine[]
  /** Income and expense accounts explaining the Earnings to date line. */
  earnings: BalanceSheetAccountLine[]
  totalAssets: UsdAmount
  totalLiabilities: UsdAmount
  earningsToDate: UsdAmount
  totalEquity: UsdAmount
  totalLiabilitiesAndEquity: UsdAmount
  identityGap: UsdAmount
  balanced: boolean
}

/** One concrete account row in the Trial Balance. */
interface TrialBalanceRow {
  /** Canonical concrete account; use it for report selection and reconciliation. */
  account: Account
  /** Display name, including the redeployment suffix when required. */
  accountLabel: string
  /** True when this account is split across several instances. */
  split: boolean
  /** True on the earliest resolved deployment row, used only for display. */
  isPrimaryInstance: boolean
  /** Sum of every debit line posted to this account. */
  totalDebit: UsdAmount
  /** Sum of every credit line posted to this account. */
  totalCredit: UsdAmount
  /** Net balance on the account's normal side. */
  balance: UsdAmount
}

/** General Ledger and Trial Balance projected from one canonical journal. */
export interface GeneralLedger {
  /** The journal, chronologically ordered. */
  entries: JournalEntry[]
  /** Per-account roll-up; rows with no activity are dropped. */
  trialBalance: TrialBalanceRow[]
  /** Sum of all gross debit lines. */
  totalDebit: UsdAmount
  /** Sum of all gross credit lines. */
  totalCredit: UsdAmount
  /** Sum of the debit-normal account balances. */
  debitBalanceTotal: UsdAmount
  /** Sum of the credit-normal account balances. */
  creditBalanceTotal: UsdAmount
  /** True when both the gross and net identities hold exactly. */
  balanced: boolean
}

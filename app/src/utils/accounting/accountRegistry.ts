/**
 * Canonical concrete accounts for the accounting journal.
 *
 * The chart of accounts owns the shared behaviour of an {@link AccountFamily}.
 * This registry owns the actual ledger identity: a Bank, Payroll, Expense, or
 * Credit redeployment is a distinct account when its contract address is known.
 * A missing address is deliberately an unresolved account, never an inferred
 * historical deployment.
 */
import { getAddress, isAddress, type Address } from 'viem'
import {
  ACCOUNT_NAMES,
  classOf,
  isDeploymentScopedAccountFamily,
  normalBalance,
  type AccountClass,
  type AccountFamily
} from './chartOfAccounts'
import type { LedgerEntry } from './ledgerEntry'

/** Stable identity of one concrete account in the books. */
export type AccountId = string

/** Whether a deployment-specific account could be resolved from source evidence. */
export type AccountResolution = 'resolved' | 'unresolved'

/** One actual account that a journal line can post to. */
export interface Account {
  /** Stable key used by journal lines and report roll-ups. */
  id: AccountId
  /** The shared chart family that supplies classification and normal side. */
  family: AccountFamily
  accountClass: AccountClass
  normalBalance: 'debit' | 'credit'
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
  resolve(family: AccountFamily, contractAddress?: string | null): Account
  /** Read a concrete account by its stable identity. */
  get(id: AccountId): Account | undefined
}

/** Stable machine keys for the chart families. Display names are never account identity. */
const FAMILY_KEYS: Readonly<Record<AccountFamily, string>> = {
  'Cash — Bank': 'cash-bank',
  'Cash — Safe': 'cash-safe',
  'Cash — Payroll': 'cash-payroll',
  'Cash — Expense': 'cash-expense',
  'Cash — Credit': 'cash-credit',
  'Cash — FeeCollector': 'cash-fee-collector',
  'Trading account': 'trading-account',
  'Wage Payable': 'wage-payable',
  'Loan Payable': 'loan-payable',
  'Interest Payable': 'interest-payable',
  'Deferred SHER Compensation': 'deferred-sher-compensation',
  'SHERS To Be Issued': 'shers-to-be-issued',
  'Owner Capital': 'owner-capital',
  'Investor Equity': 'investor-equity',
  'Retained Earnings': 'retained-earnings',
  'Service Revenue': 'service-revenue',
  'Trading Gain': 'trading-gain',
  'Payroll Expense': 'payroll-expense',
  'Operating Expense': 'operating-expense',
  'Interest Expense': 'interest-expense',
  'Dividend Expense': 'dividend-expense',
  'Trading Loss': 'trading-loss',
  'Transaction Fee Expense': 'transaction-fee-expense'
}

function normalizeContractAddress(value: string | null | undefined): Address | undefined {
  return value && isAddress(value) ? getAddress(value) : undefined
}

/** Build one concrete account. Only a contract address can resolve a deployment-specific family. */
function makeAccount(family: AccountFamily, contractAddress?: string | null): Account {
  const address = isDeploymentScopedAccountFamily(family)
    ? normalizeContractAddress(contractAddress)
    : undefined
  const resolution: AccountResolution =
    isDeploymentScopedAccountFamily(family) && !address ? 'unresolved' : 'resolved'
  const suffix = address
    ? `:${address.toLowerCase()}`
    : resolution === 'unresolved'
      ? ':unresolved'
      : ''

  return {
    id: `${FAMILY_KEYS[family]}${suffix}`,
    family,
    accountClass: classOf(family),
    normalBalance: normalBalance(family),
    ...(address ? { contractAddress: address } : {}),
    resolution
  }
}

function noteAccount(
  accounts: Map<AccountId, Account>,
  family: AccountFamily | null,
  contractAddress?: string | null
): void {
  if (!family) return
  const account = makeAccount(family, contractAddress)
  accounts.set(account.id, account)
}

/**
 * Build one immutable registry for an assembled posting feed. The source address
 * attached by a mapper is the only evidence used to resolve a deployment-specific
 * account; posting order and activity on another contract are intentionally ignored.
 */
export function buildAccountRegistry(entries: readonly LedgerEntry[]): AccountRegistry {
  const accounts = new Map<AccountId, Account>()

  // Non-deployment families are always one concrete account. Deployment-specific
  // families enter the registry only when the book actually touches a known or
  // unresolved concrete account.
  for (const family of ACCOUNT_NAMES) {
    if (!isDeploymentScopedAccountFamily(family)) noteAccount(accounts, family)
  }
  for (const entry of entries) {
    noteAccount(accounts, entry.debit, entry.debitInstance)
    noteAccount(accounts, entry.credit, entry.creditInstance)
  }

  const byChartOrder = new Map(ACCOUNT_NAMES.map((family, index) => [family, index]))
  const ordered = [...accounts.values()].sort((a, b) => {
    const familyOrder =
      (byChartOrder.get(a.family) ?? Infinity) - (byChartOrder.get(b.family) ?? Infinity)
    if (familyOrder !== 0) return familyOrder
    return a.id.localeCompare(b.id)
  })
  const byId = new Map(ordered.map((account) => [account.id, account]))

  return {
    accounts: ordered,
    resolve(family, contractAddress) {
      const account = makeAccount(family, contractAddress)
      return byId.get(account.id) ?? account
    },
    get(id) {
      return byId.get(id)
    }
  }
}

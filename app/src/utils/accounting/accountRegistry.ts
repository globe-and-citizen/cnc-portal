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
  ACCOUNT_FAMILIES,
  accountFamilyOf,
  type AccountFamily,
  type AccountName
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
  /** The shared family that supplies this account's classification and normal side. */
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

function normalizeContractAddress(value: string | null | undefined): Address | undefined {
  return value && isAddress(value) ? getAddress(value) : undefined
}

/** Resolve one chart family and optional deployment address into its concrete Account identity. */
export function accountFor(familyName: AccountName, contractAddress?: string | null): Account {
  const family = accountFamilyOf(familyName)
  const address = family.deploymentScoped ? normalizeContractAddress(contractAddress) : undefined
  const resolution: AccountResolution =
    family.deploymentScoped && !address ? 'unresolved' : 'resolved'
  const suffix = address
    ? `:${address.toLowerCase()}`
    : resolution === 'unresolved'
      ? ':unresolved'
      : ''

  return {
    id: `${family.id}${suffix}`,
    family,
    ...(address ? { contractAddress: address } : {}),
    resolution
  }
}

function noteAccount(
  accounts: Map<AccountId, Account>,
  family: AccountName | null,
  contractAddress?: string | null
): void {
  if (!family) return
  const account = accountFor(family, contractAddress)
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
  for (const family of ACCOUNT_FAMILIES) {
    if (!family.deploymentScoped) noteAccount(accounts, family.name)
  }
  for (const entry of entries) {
    noteAccount(accounts, entry.debit, entry.debitInstance)
    noteAccount(accounts, entry.credit, entry.creditInstance)
  }

  const byChartOrder = new Map(ACCOUNT_FAMILIES.map((family, index) => [family.id, index]))
  const ordered = [...accounts.values()].sort((a, b) => {
    const familyOrder =
      (byChartOrder.get(a.family.id) ?? Infinity) - (byChartOrder.get(b.family.id) ?? Infinity)
    if (familyOrder !== 0) return familyOrder
    return a.id.localeCompare(b.id)
  })
  const byId = new Map(ordered.map((account) => [account.id, account]))

  return {
    accounts: ordered,
    resolve(family, contractAddress) {
      const account = accountFor(family, contractAddress)
      return byId.get(account.id) ?? account
    },
    get(id) {
      return byId.get(id)
    }
  }
}

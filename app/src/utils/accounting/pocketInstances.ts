/**
 * Which **contract deployment** a cash-pocket leg belongs to.
 *
 * A team can redeploy a pocket (Bank / Payroll / Expense / Credit — see
 * {@link isInstancedPocket}): the account keeps its name but the cash now sits in
 * a new contract. The books number those deployments oldest-first — the original
 * keeps the plain account name, each later one reads `Cash — Bank 2` / `3` — so
 * the trial balance can show one line per deployment and the general ledger can
 * say, posting by posting, which deployment moved.
 *
 * The numbering is derived once from a feed and shared by both views, so a line
 * called `Cash — Bank 2` means the same contract everywhere. Pure and
 * presentation-only: the canonical entries are untouched.
 */
import { isInstancedPocket, type AccountName } from './chartOfAccounts'
import type { LedgerEntry } from './ledgerEntry'

/** One deployment of a cash pocket, as the books number it. */
export interface PocketInstance {
  account: AccountName
  /** The pocket contract address (checksum, as carried on the entry legs). */
  instance: string
  /** 1-based deployment number, oldest activity first. */
  number: number
  /** Display name: the plain account for the first deployment, then `… 2` / `… 3`. */
  label: string
  /** Unix seconds of the deployment's earliest posting — what orders the numbering. */
  firstTs: number
}

/** The deployments a feed touched, and how to name a leg of one. */
export interface PocketInstanceIndex {
  /** True when `account` was redeployed — its postings span several contracts. */
  isSplit(account: string): boolean
  /** Every deployment of `account`, oldest first; empty for a never-redeployed one. */
  instancesOf(account: string): PocketInstance[]
  /**
   * The deployment a leg belongs to — `undefined` when the account never split,
   * or the leg carries no contract address (those fold into the first deployment,
   * exactly as the trial balance folds them).
   */
  instanceOf(account: string | null | undefined, instance?: string): PocketInstance | undefined
  /** Display name for a leg: the plain account name unless it is a later deployment. */
  labelOf(account: string | null | undefined, instance?: string): string
}

/** An index over a book with no redeploy — every account reads under its plain name. */
export const NO_POCKET_INSTANCES: PocketInstanceIndex = buildPocketInstances([])

/** The display name of the `number`-th deployment of an account. */
function labelFor(account: string, number: number): string {
  return number > 1 ? `${account} ${number}` : account
}

/** Note one leg's contract address against its account, keeping the earliest time. */
function noteLeg(
  seen: Map<string, Map<string, { instance: string; firstTs: number }>>,
  account: string | null | undefined,
  instance: string | undefined,
  timestamp: number
): void {
  if (!account || !instance || !isInstancedPocket(account as AccountName)) return
  let byInstance = seen.get(account)
  if (!byInstance) {
    byInstance = new Map()
    seen.set(account, byInstance)
  }
  const key = instance.toLowerCase()
  const known = byInstance.get(key)
  if (!known) byInstance.set(key, { instance, firstTs: timestamp })
  else if (timestamp < known.firstTs) known.firstTs = timestamp
}

/**
 * Number every cash-pocket deployment the feed touched, oldest activity first
 * (ties broken on the address, so the order never depends on feed order).
 */
export function buildPocketInstances(entries: readonly LedgerEntry[]): PocketInstanceIndex {
  const seen = new Map<string, Map<string, { instance: string; firstTs: number }>>()
  for (const entry of entries) {
    noteLeg(seen, entry.debit, entry.debitInstance, entry.timestamp)
    noteLeg(seen, entry.credit, entry.creditInstance, entry.timestamp)
  }

  const byAccount = new Map<string, PocketInstance[]>()
  const byLeg = new Map<string, PocketInstance>()
  for (const [account, instances] of seen) {
    const ordered = [...instances.values()]
      .sort((a, b) => a.firstTs - b.firstTs || a.instance.localeCompare(b.instance))
      .map((found, i) => ({
        account: account as AccountName,
        instance: found.instance,
        number: i + 1,
        label: labelFor(account, i + 1),
        firstTs: found.firstTs
      }))
    byAccount.set(account, ordered)
    for (const found of ordered) byLeg.set(`${account}|${found.instance.toLowerCase()}`, found)
  }

  const lookup = (
    account: string | null | undefined,
    instance?: string
  ): PocketInstance | undefined => {
    if (!account || !instance) return undefined
    const found = byLeg.get(`${account}|${instance.toLowerCase()}`)
    return found && (byAccount.get(account)?.length ?? 0) > 1 ? found : undefined
  }

  return {
    isSplit: (account) => (byAccount.get(account)?.length ?? 0) > 1,
    instancesOf: (account) => byAccount.get(account) ?? [],
    instanceOf: lookup,
    labelOf: (account, instance) => lookup(account, instance)?.label ?? account ?? ''
  }
}

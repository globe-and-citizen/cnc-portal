/**
 * Back-fill the Bank deployment a Community Credit posting settled against.
 *
 * A funded round sweeps its principal to the Bank with a raw `safeTransfer` that
 * emits no Bank event (and a repayment runs Bank → FixedReturn → lender in one
 * transaction, also eventless from the Bank's side), so the credit mapper books
 * the `Cash — Bank` leg with **no contract instance**. On a team that never
 * redeployed its Bank that is invisible — the leg folds into the sole Bank. Once
 * the Bank has been redeployed, though, the sweep lands in whichever Bank was live
 * at the time, and leaving the leg un-instanced folds it into the **first** Bank
 * instead (see {@link ./generalLedger} foldBlankBucket), so the loan shows under
 * `Cash — Bank` rather than `Cash — Bank 2`.
 *
 * We recover the deployment here, once every mapper has run, from the Bank legs the
 * Bank mapper already stamped: each un-instanced credit Bank leg takes the Bank
 * deployment **active at its timestamp** — the latest Bank whose own activity had
 * begun by then. The sweep leaves no event of its own, so the Bank's observed
 * activity is the best signal available; a credit that funds a Bank with no other
 * activity of its own can't be placed and stays folded into the first Bank.
 */
import type { Address } from 'viem'
import type { LedgerEntry } from './ledgerEntry'

const BANK = 'Cash — Bank'

/** A Community Credit posting (UC-CREDIT-*), whose cash settles in the Bank. */
function isCreditPosting(entry: LedgerEntry): boolean {
  return entry.useCase.startsWith('UC-CREDIT')
}

/**
 * Stamp each un-instanced `Cash — Bank` leg of a Community Credit posting with the
 * Bank deployment live at its timestamp. A no-op unless the Bank was redeployed
 * (fewer than two observed Bank deployments leaves nothing to disambiguate).
 */
export function attachCreditBankInstances(entries: readonly LedgerEntry[]): LedgerEntry[] {
  // The Bank deployments the Bank mapper observed, keyed by contract, each at its
  // earliest activity — the timeline a credit sweep is placed on.
  const firstTsByInstance = new Map<Address, number>()
  const note = (instance: Address | undefined, timestamp: number): void => {
    if (!instance) return
    const prev = firstTsByInstance.get(instance)
    if (prev == null || timestamp < prev) firstTsByInstance.set(instance, timestamp)
  }
  for (const entry of entries) {
    if (entry.debit === BANK) note(entry.debitInstance, entry.timestamp)
    if (entry.credit === BANK) note(entry.creditInstance, entry.timestamp)
  }

  const timeline = [...firstTsByInstance.entries()].sort((a, b) => a[1] - b[1])
  if (timeline.length < 2) return entries.slice()

  // The latest Bank whose activity had begun by `ts`; the earliest Bank when the
  // posting predates them all (a credit funded before any Bank event of its own).
  const activeAt = (ts: number): Address => {
    let active = timeline[0]![0]
    for (const [instance, firstTs] of timeline) {
      if (firstTs <= ts) active = instance
      else break
    }
    return active
  }

  return entries.map((entry) => {
    if (!isCreditPosting(entry)) return entry
    if (entry.debit === BANK && !entry.debitInstance) {
      return { ...entry, debitInstance: activeAt(entry.timestamp) }
    }
    if (entry.credit === BANK && !entry.creditInstance) {
      return { ...entry, creditInstance: activeAt(entry.timestamp) }
    }
    return entry
  })
}

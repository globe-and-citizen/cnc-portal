/**
 * Validated JournalEntry model.
 *
 * This is the canonical accounting boundary: every monetary posting names a
 * concrete AccountId resolved by `accountRegistry.ts` before report projections
 * consume it.
 */
import { sourceOperationIdOf, type LedgerEntry } from './ledgerEntry'
import { ZERO_USD_AMOUNT } from './monetaryAmount'
import type { JournalEntry, JournalEntryLine, UsdAmount } from './types'

/** Result of validating source postings before they become JournalEntry records. */
interface JournalSourceReconciliation {
  /** Postings that can participate in a complete accounting operation. */
  entries: LedgerEntry[]
  /** Fee source operations whose Bank outflow evidence is missing. */
  unmatchedFeeOperationIds: string[]
}

/** The Bank fee posting is identified by its accounting lines, not a reporting category. */
export function isBankFeePosting(entry: LedgerEntry): boolean {
  return entry.debit === 'Transaction Fee Expense' && entry.credit === 'Cash — Bank'
}

/** A source posting that proves money left the Bank in this accounting operation. */
function isBankOutflowPosting(entry: LedgerEntry): boolean {
  return !isBankFeePosting(entry) && entry.debit !== null && entry.credit === 'Cash — Bank'
}

/** The shared source-operation identity used to form one JournalEntry. */
function operationIdOf(entry: LedgerEntry): string {
  return sourceOperationIdOf(entry.txHash ?? entry.sourceOperationId ?? entry.id)
}

/**
 * Reconcile Bank fee postings at the JournalEntry boundary.
 *
 * A fee is a JournalEntryLine of a Bank outflow, never a standalone accounting
 * operation. The source mappers preserve all event evidence; this boundary groups
 * it by source operation, withholds only an orphaned fee, and lets unrelated
 * postings from the same operation remain available to the journal.
 */
export function reconcileJournalEntrySources(
  entries: readonly LedgerEntry[]
): JournalSourceReconciliation {
  const operationsWithBankOutflow = new Set<string>()
  for (const entry of entries) {
    if (isBankOutflowPosting(entry)) operationsWithBankOutflow.add(operationIdOf(entry))
  }

  const unmatchedFeeOperationIds = new Set<string>()
  const reconciledEntries = entries.filter((entry) => {
    if (!isBankFeePosting(entry)) return true
    const operationId = operationIdOf(entry)
    if (operationsWithBankOutflow.has(operationId)) return true
    unmatchedFeeOperationIds.add(operationId)
    return false
  })

  return { entries: reconciledEntries, unmatchedFeeOperationIds: [...unmatchedFeeOperationIds] }
}

/** One line's debit amount, or zero when it is a credit line. */
export function debitOf(line: JournalEntryLine): UsdAmount {
  return line.debit ?? ZERO_USD_AMOUNT
}

/** One line's credit amount, or zero when it is a debit line. */
export function creditOf(line: JournalEntryLine): UsdAmount {
  return line.credit ?? ZERO_USD_AMOUNT
}

/** The domain error raised before a projection can consume an invalid entry. */
class InvalidJournalEntryError extends Error {
  constructor(entryId: string, reasons: readonly string[]) {
    super(`Invalid journal entry "${entryId}": ${reasons.join('; ')}`)
    this.name = 'InvalidJournalEntryError'
  }
}

/** Whether a journal entry's debit and credit line totals match in reporting currency. */
function isBalanced(entry: JournalEntry): boolean {
  if (entry.kind === 'memo') return entry.lines.length === 0

  let debit = ZERO_USD_AMOUNT
  let credit = ZERO_USD_AMOUNT
  for (const line of entry.lines) {
    debit += debitOf(line)
    credit += creditOf(line)
  }
  return debit === credit
}

/** Validate the shape and balance invariant of one journal entry. */
function validationErrors(entry: JournalEntry): string[] {
  const errors: string[] = []
  if (!entry.id.trim()) errors.push('entry id is required')
  if (!entry.sourceOperationId.trim()) errors.push('source operation id is required')
  if (!Number.isFinite(entry.timestamp)) errors.push('timestamp must be finite')
  if (entry.kind !== 'monetary' && entry.kind !== 'memo') errors.push('entry kind is invalid')

  if (entry.kind === 'memo') {
    if (entry.lines.length !== 0) errors.push('memo entries cannot contain monetary lines')
    return errors
  }

  if (entry.lines.length === 0) errors.push('monetary entries require journal lines')
  const lineIds = new Set<string>()
  let debitLines = 0
  let creditLines = 0

  for (const line of entry.lines) {
    if (!line.id.trim()) errors.push('line id is required')
    else if (lineIds.has(line.id)) errors.push(`duplicate line id "${line.id}"`)
    else lineIds.add(line.id)
    if (!line.account.id.trim()) errors.push(`line "${line.id}" account id is required`)
    if (!line.account.family.id.trim() || !line.account.family.name.trim())
      errors.push(`line "${line.id}" account family is required`)
    if (line.account.resolution !== 'resolved' && line.account.resolution !== 'unresolved')
      errors.push(`line "${line.id}" account resolution is invalid`)
    if (line.account.resolution === 'unresolved' && line.account.contractAddress)
      errors.push(`line "${line.id}" cannot be unresolved and include a contract address`)

    const hasDebit = line.debit !== undefined
    const hasCredit = line.credit !== undefined
    if (hasDebit === hasCredit) {
      errors.push(`line "${line.id}" must carry exactly one debit or credit amount`)
      continue
    }

    const amount = line.debit ?? line.credit
    if (amount === undefined || amount < ZERO_USD_AMOUNT)
      errors.push(`line "${line.id}" amount must be non-negative`)
    if (hasDebit) debitLines += 1
    else creditLines += 1
  }

  if (debitLines === 0 || creditLines === 0)
    errors.push('monetary entries require at least one debit and one credit line')
  if (!isBalanced(entry)) errors.push('debit and credit totals must balance')
  return errors
}

/** Construct a journal entry only when its structural and balance invariants hold. */
export function createJournalEntry(entry: JournalEntry): JournalEntry {
  const validated: JournalEntry = {
    ...entry,
    ...(entry.source ? { source: { ...entry.source } } : {}),
    ...(entry.legacyClassification
      ? {
          legacyClassification: {
            ...entry.legacyClassification,
            targets: entry.legacyClassification.targets.map((target) => ({ ...target }))
          }
        }
      : {}),
    lines: entry.lines.map(
      (line) => ({ ...line, account: { ...line.account } }) as JournalEntryLine
    )
  }
  const errors = validationErrors(validated)
  if (errors.length) throw new InvalidJournalEntryError(validated.id, errors)
  return validated
}

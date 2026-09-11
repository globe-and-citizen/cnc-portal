/** Structural and double-entry validation for finalized JournalEntry records. */
import { ZERO_USD_AMOUNT } from './monetaryAmount'
import type { JournalEntry } from './types'

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
    debit += line.debit ?? ZERO_USD_AMOUNT
    credit += line.credit ?? ZERO_USD_AMOUNT
  }
  return debit === credit
}

/** Collect shape and balance violations for one finalized journal entry. */
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
    if (!line.account.family.id.trim() || !line.account.family.name.trim()) {
      errors.push(`line "${line.id}" account family is required`)
    }
    if (line.account.resolution !== 'resolved' && line.account.resolution !== 'unresolved') {
      errors.push(`line "${line.id}" account resolution is invalid`)
    }
    if (line.account.resolution === 'unresolved' && line.account.contractAddress) {
      errors.push(`line "${line.id}" cannot be unresolved and include a contract address`)
    }

    const hasDebit = line.debit !== undefined
    const hasCredit = line.credit !== undefined
    if (hasDebit === hasCredit) {
      errors.push(`line "${line.id}" must carry exactly one debit or credit amount`)
      continue
    }

    const amount = line.debit ?? line.credit
    if (amount === undefined || amount < ZERO_USD_AMOUNT) {
      errors.push(`line "${line.id}" amount must be non-negative`)
    }
    if (hasDebit) debitLines += 1
    else creditLines += 1
  }

  if (debitLines === 0 || creditLines === 0) {
    errors.push('monetary entries require at least one debit and one credit line')
  }
  if (!isBalanced(entry)) errors.push('debit and credit totals must balance')
  return errors
}

/** Reject an invalid JournalEntry at its single construction boundary. */
export function assertValidJournalEntry(entry: JournalEntry): void {
  const errors = validationErrors(entry)
  if (errors.length) throw new InvalidJournalEntryError(entry.id, errors)
}

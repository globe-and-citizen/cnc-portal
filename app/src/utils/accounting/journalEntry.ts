/**
 * Journal draft reconciliation and validated JournalEntry finalization.
 *
 * This is the canonical accounting boundary: every monetary posting names a
 * concrete AccountId resolved by `accountRegistry.ts` before report projections
 * consume it.
 */
import { getTokenDecimals } from '@/utils/tokens/metadata'
import { buildAccountRegistry } from './accountRegistry'
import { sourceOperationIdOf, transactionHashOf, type JournalEntryDraft } from './journalEntryDraft'
import { assertValidJournalEntry } from './journalEntryValidation'
import { ZERO_USD_AMOUNT, usdAmountFromToken, usdRateFromNumber } from './monetaryAmount'
import type { AccountRegistry, JournalEntry, JournalEntryLine, UsdAmount } from './types'

/** Result of validating source postings before they become JournalEntry records. */
interface JournalDraftReconciliation {
  /** Postings that can participate in a complete accounting operation. */
  entries: JournalEntryDraft[]
  /** Fee source operations whose Bank outflow evidence is missing. */
  unmatchedFeeOperationIds: string[]
}

/** The Bank fee posting is identified by its accounting lines, not a reporting category. */
function isBankFeeDraft(entry: JournalEntryDraft): boolean {
  return entry.debit === 'Transaction Fee Expense' && entry.credit === 'Cash — Bank'
}

/** A source posting that proves money left the Bank in this accounting operation. */
function isBankOutflowPosting(entry: JournalEntryDraft): boolean {
  return !isBankFeeDraft(entry) && entry.debit !== null && entry.credit === 'Cash — Bank'
}

/** The shared source-operation identity used to form one JournalEntry. */
function operationIdOf(entry: JournalEntryDraft): string {
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
function reconcileDrafts(entries: readonly JournalEntryDraft[]): JournalDraftReconciliation {
  const operationsWithBankOutflow = new Set<string>()
  for (const entry of entries) {
    if (isBankOutflowPosting(entry)) operationsWithBankOutflow.add(operationIdOf(entry))
  }

  const unmatchedFeeOperationIds = new Set<string>()
  const reconciledEntries = entries.filter((entry) => {
    if (!isBankFeeDraft(entry)) return true
    const operationId = operationIdOf(entry)
    if (operationsWithBankOutflow.has(operationId)) return true
    unmatchedFeeOperationIds.add(operationId)
    return false
  })

  return { entries: reconciledEntries, unmatchedFeeOperationIds: [...unmatchedFeeOperationIds] }
}

/** The emitting side of one internal source posting, when both identities are evidenced. */
function sourceSide(entry: JournalEntryDraft): 'debit' | 'credit' | null {
  const source = entry.sourceContract?.toLowerCase()
  if (!source) return null
  if (entry.creditInstance?.toLowerCase() === source) return 'credit'
  if (entry.debitInstance?.toLowerCase() === source) return 'debit'
  return null
}

/** Economic identity shared by the two contract-side events for one internal movement. */
function mirroredMovementKey(entry: JournalEntryDraft): string {
  return [
    operationIdOf(entry),
    entry.debit,
    entry.debitInstance?.toLowerCase() ?? '',
    entry.credit,
    entry.creditInstance?.toLowerCase() ?? '',
    entry.token,
    entry.rawAmount,
    entry.rate ?? ''
  ].join('|')
}

/**
 * Remove only proven contract-side mirrors of an internal movement.
 *
 * The former global value-and-time key could collapse unrelated transactions.
 * Here a candidate must share one transaction hash, the exact movement, and
 * complementary source contracts: one event emitted by the credited pocket and
 * one emitted by the debited pocket. Matching is count-preserving, so two equal
 * transfers inside one transaction retain two source-side drafts.
 */
function reconcileMirroredInternalDrafts(
  entries: readonly JournalEntryDraft[]
): JournalEntryDraft[] {
  const candidates = new Map<string, { debit: JournalEntryDraft[]; credit: JournalEntryDraft[] }>()
  for (const entry of entries) {
    if (!entry.internal || !entry.txHash) continue
    const side = sourceSide(entry)
    if (!side) continue
    const key = mirroredMovementKey(entry)
    const group = candidates.get(key) ?? { debit: [], credit: [] }
    group[side].push(entry)
    candidates.set(key, group)
  }

  const duplicateIds = new Set<string>()
  for (const group of candidates.values()) {
    const pairCount = Math.min(group.debit.length, group.credit.length)
    for (let index = 0; index < pairCount; index += 1) {
      const destinationEvent = group.debit[index]
      if (destinationEvent) duplicateIds.add(destinationEvent.id)
    }
  }
  return entries.filter((entry) => !duplicateIds.has(entry.id))
}

/** Convert one balanced draft posting into canonical debit and credit lines. */
function linesOf(entry: JournalEntryDraft, accounts: AccountRegistry): JournalEntryLine[] {
  if (typeof entry.rate !== 'number') {
    throw new Error(`Journal entry draft "${entry.id}" requires a rate before finalization`)
  }
  const rate = usdRateFromNumber(entry.rate)
  const rawAmount = BigInt(entry.rawAmount)
  const amount = usdAmountFromToken(rawAmount, entry.token, rate)
  const movement = {
    token: entry.token,
    rawAmount,
    decimals: getTokenDecimals(entry.token),
    rate
  }
  const lines: JournalEntryLine[] = []
  if (entry.debit) {
    lines.push({
      id: `${entry.id}:debit`,
      account: accounts.resolve(entry.debit, entry.debitInstance),
      movement: { ...movement },
      debit: amount
    })
  }
  if (entry.credit) {
    lines.push({
      id: `${entry.id}:credit`,
      account: accounts.resolve(entry.credit, entry.creditInstance),
      movement: { ...movement },
      credit: amount
    })
  }
  return lines
}

/** Coalesce one operation's lines by side, concrete account, token, and rate. */
function mergedLines(
  entries: readonly JournalEntryDraft[],
  accounts: AccountRegistry
): JournalEntryLine[] {
  const orderedLines = entries.flatMap((entry) => linesOf(entry, accounts))
  const merge = (lines: readonly JournalEntryLine[]): JournalEntryLine[] => {
    const byMovement = new Map<string, JournalEntryLine>()
    for (const line of lines) {
      const side = line.debit !== undefined ? 'debit' : 'credit'
      const movement = line.movement
      const key = [side, line.account.id, movement?.token ?? '', movement?.rate ?? ''].join('|')
      const existing = byMovement.get(key)
      if (!existing) {
        byMovement.set(key, { ...line, ...(movement ? { movement: { ...movement } } : {}) })
        continue
      }
      if (existing.debit !== undefined && line.debit !== undefined) existing.debit += line.debit
      if (existing.credit !== undefined && line.credit !== undefined) existing.credit += line.credit
      if (existing.movement && movement) existing.movement.rawAmount += movement.rawAmount
    }
    return [...byMovement.values()]
  }
  return [
    ...merge(orderedLines.filter((line) => line.debit !== undefined)),
    ...merge(orderedLines.filter((line) => line.credit !== undefined))
  ]
}

function isExternalOutflowDraft(entry: JournalEntryDraft): boolean {
  return (
    !entry.internal &&
    entry.useCase === 'CASH-OUT' &&
    entry.debit !== null &&
    entry.credit !== null &&
    !entry.debit.startsWith('Cash — ') &&
    entry.debit !== 'Transaction Fee Expense' &&
    (entry.credit === 'Cash — Bank' || entry.credit === 'Cash — Safe')
  )
}

/** Whether one transaction-backed outflow can receive a manual counter-account. */
function accountAssignmentState(
  entries: readonly JournalEntryDraft[],
  operationId: string
): JournalEntry['accountAssignment'] | undefined {
  if (!/^0x[0-9a-fA-F]{64}$/.test(operationId)) return undefined
  const withdrawals = entries.filter(isExternalOutflowDraft)
  if (!withdrawals.length) return undefined
  const nonFeeDrafts = entries.filter((entry) => !isBankFeeDraft(entry))
  return { editable: withdrawals.length === 1 && nonFeeDrafts.length === 1 }
}

/** Copy presentation and drill-down facts from the primary draft onto the final entry. */
function contextualFields(
  primary: JournalEntryDraft,
  counterparties: ReadonlySet<string>,
  activityAmount: UsdAmount
): Pick<
  JournalEntry,
  | 'activityAmount'
  | 'counterparty'
  | 'initiator'
  | 'shares'
  | 'creditOfferId'
  | 'creditRemainingUsd'
  | 'minutesWorked'
  | 'periodEnd'
  | 'expenseFrequencyType'
  | 'expenseApprovedUsd'
  | 'expenseRemainingUsd'
> {
  return {
    activityAmount,
    ...(counterparties.size <= 1 && primary.counterparty
      ? { counterparty: primary.counterparty }
      : {}),
    ...(primary.initiator ? { initiator: primary.initiator } : {}),
    ...(primary.shares !== undefined ? { shares: primary.shares } : {}),
    ...(primary.creditOfferId ? { creditOfferId: primary.creditOfferId } : {}),
    ...(primary.creditRemainingUsd !== undefined
      ? { creditRemainingUsd: primary.creditRemainingUsd }
      : {}),
    ...(primary.minutesWorked !== undefined ? { minutesWorked: primary.minutesWorked } : {}),
    ...(primary.periodEnd !== undefined ? { periodEnd: primary.periodEnd } : {}),
    ...(primary.expenseFrequencyType !== undefined
      ? { expenseFrequencyType: primary.expenseFrequencyType }
      : {}),
    ...(primary.expenseApprovedUsd !== undefined
      ? { expenseApprovedUsd: primary.expenseApprovedUsd }
      : {}),
    ...(primary.expenseRemainingUsd !== undefined
      ? { expenseRemainingUsd: primary.expenseRemainingUsd }
      : {})
  }
}

/** Finalize all balanced draft postings that belong to one accounting operation. */
function finalizeOperation(
  entries: readonly JournalEntryDraft[],
  accounts: AccountRegistry,
  operationId: string
): JournalEntry {
  const ordered = entries
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id))
  const primary = ordered.find((entry) => !isBankFeeDraft(entry)) ?? ordered[0]!
  const lineDrafts = [primary, ...ordered.filter((entry) => entry !== primary)]
  const monetary = ordered.some((entry) => entry.debit !== null || entry.credit !== null)
  const counterparties = new Set(
    ordered.flatMap((entry) => (entry.counterparty ? [entry.counterparty.toLowerCase()] : []))
  )
  const txHash = ordered.find((entry) => entry.txHash)?.txHash ?? transactionHashOf(operationId)
  const nonFeeDrafts = ordered.filter((entry) => !isBankFeeDraft(entry))
  const activityAmount = monetary
    ? (nonFeeDrafts.length > 0 ? nonFeeDrafts : [primary])
        .flatMap((entry) => linesOf(entry, accounts))
        .reduce((sum, line) => sum + debitOf(line), ZERO_USD_AMOUNT)
    : ZERO_USD_AMOUNT
  const accountAssignment = accountAssignmentState(ordered, operationId)

  return createJournalEntry({
    id: operationId,
    sourceOperationId: operationId,
    timestamp: ordered[0]!.timestamp,
    useCase: primary.useCase,
    memo: primary.memo,
    internal: nonFeeDrafts.length > 0 && nonFeeDrafts.every((entry) => entry.internal),
    kind: monetary ? 'monetary' : 'memo',
    ...(primary.category ? { category: primary.category } : {}),
    ...(txHash ? { txHash } : {}),
    ...contextualFields(primary, counterparties, activityAmount),
    ...(accountAssignment ? { accountAssignment } : {}),
    lines: monetary ? mergedLines(lineDrafts, accounts) : []
  })
}

/** Result of the only draft-to-journal reconciliation and validation boundary. */
export interface JournalFinalization {
  journal: JournalEntry[]
  unmatchedFeeOperationIds: string[]
}

/**
 * Reconcile source evidence, resolve concrete accounts, and validate each final
 * JournalEntry exactly once.
 */
export function finalizeJournalEntryDrafts(
  drafts: readonly JournalEntryDraft[]
): JournalFinalization {
  const reconciliation = reconcileDrafts(drafts)
  const reconciled = reconcileMirroredInternalDrafts(reconciliation.entries).sort(
    (a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id)
  )
  const accounts = buildAccountRegistry(reconciled)
  const byOperation = new Map<string, JournalEntryDraft[]>()
  for (const draft of reconciled) {
    const operationId = operationIdOf(draft)
    const group = byOperation.get(operationId)
    if (group) group.push(draft)
    else byOperation.set(operationId, [draft])
  }

  return {
    journal: [...byOperation.entries()]
      .map(([operationId, entries]) => finalizeOperation(entries, accounts, operationId))
      .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id)),
    unmatchedFeeOperationIds: reconciliation.unmatchedFeeOperationIds
  }
}

/** One line's debit amount, or zero when it is a credit line. */
export function debitOf(line: JournalEntryLine): UsdAmount {
  return line.debit ?? ZERO_USD_AMOUNT
}

/** One line's credit amount, or zero when it is a debit line. */
export function creditOf(line: JournalEntryLine): UsdAmount {
  return line.credit ?? ZERO_USD_AMOUNT
}

/** Construct a journal entry only when its structural and balance invariants hold. */
export function createJournalEntry(entry: JournalEntry): JournalEntry {
  const validated: JournalEntry = {
    ...entry,
    ...(entry.accountAssignment
      ? {
          accountAssignment: { ...entry.accountAssignment }
        }
      : {}),
    lines: entry.lines.map(
      (line) => ({ ...line, account: { ...line.account } }) as JournalEntryLine
    )
  }
  assertValidJournalEntry(validated)
  return validated
}

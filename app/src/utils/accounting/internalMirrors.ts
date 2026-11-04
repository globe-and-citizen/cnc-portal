/**
 * Contract-side mirrors of one internal movement.
 *
 * When cash moves between two team pockets, both contracts can emit an event for
 * the same transfer. Only one of them is the accounting operation; this module
 * proves and removes the other before journal finalization.
 */
import { draftOperationIdOf, type JournalEntryDraft } from './journalEntryDraft'

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
    draftOperationIdOf(entry),
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
export function reconcileMirroredInternalDrafts(
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

/**
 * Unsolicited airdrops stay out of the books. A Safe movement of a contract the
 * Safe never acquired through a swap is not a company asset, so it is set aside
 * before valuation instead of leaving every report waiting for evidence that
 * will never exist. Other sources only emit their contracts' own movements.
 */
import { isAcceptedAsset, swappedAssets } from '@/utils/tokens/assetRecognition'
import type { JournalEntryDraft } from './journalEntryDraft'

export function withoutUnrecognizedMovements(
  drafts: readonly JournalEntryDraft[],
  safeAddress: string | undefined
): { drafts: JournalEntryDraft[]; ignored: JournalEntryDraft[] } {
  const swapped = swappedAssets(drafts)
  const kept: JournalEntryDraft[] = []
  const ignored: JournalEntryDraft[] = []
  for (const entry of drafts) {
    const fromSafe =
      !!safeAddress && entry.sourceContract?.toLowerCase() === safeAddress.toLowerCase()
    if (fromSafe && !isAcceptedAsset(entry.token, swapped)) ignored.push(entry)
    else kept.push(entry)
  }
  return { drafts: kept, ignored }
}

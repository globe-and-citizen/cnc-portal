/**
 * Unsolicited airdrops stay out of the books. A Safe movement of a contract the
 * Safe never acquired through a swap is not a company asset, so it is dropped
 * before valuation instead of leaving every report waiting for evidence that
 * will never exist. Other sources only emit their contracts' own movements.
 */
import { isAcceptedAsset, swappedAssets } from '@/utils/tokens/assetRecognition'
import type { JournalEntryDraft } from './journalEntryDraft'

export function withoutUnrecognizedMovements(
  drafts: readonly JournalEntryDraft[],
  safeAddress: string | undefined
): JournalEntryDraft[] {
  const swapped = swappedAssets(drafts)
  return drafts.filter(
    (entry) =>
      !safeAddress ||
      entry.sourceContract?.toLowerCase() !== safeAddress.toLowerCase() ||
      isAcceptedAsset(entry.token, swapped)
  )
}

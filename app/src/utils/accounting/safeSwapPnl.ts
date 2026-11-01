/** Carry the Safe overview's swap P&L into the swaps the books replay. */
import type { SafeSwapResult } from '@/utils/safe/swapPnl'
import type { JournalEntryDraft } from './journalEntryDraft'
import { usdAmountFromNumber } from './monetaryAmount'

/**
 * Attach the Safe overview's P&L of each swap to that swap's legs, so the exchange books the
 * same amount to Swap P&L (see `prepareSafeExchanges`). A swap the overview does not value
 * keeps the result it realizes.
 */
export function withSafeSwapPnl(
  drafts: readonly JournalEntryDraft[],
  swaps: readonly SafeSwapResult[]
): JournalEntryDraft[] {
  const pnlByTxHash = new Map(
    swaps.map(({ txHash, pnlUsd }) => [txHash.toLowerCase(), usdAmountFromNumber(pnlUsd)])
  )
  return drafts.map((entry) => {
    const swapPnl =
      entry.useCase === 'SAFE-SWAP' ? pnlByTxHash.get(entry.txHash?.toLowerCase() ?? '') : undefined
    return swapPnl === undefined ? entry : { ...entry, swapPnl }
  })
}

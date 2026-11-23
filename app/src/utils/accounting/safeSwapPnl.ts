/** Carry the Safe overview's swap P&L into the swaps the books replay. */
import type { SafeSwapExchange } from '@/utils/safe/costBasis'
import type { JournalEntryDraft } from './journalEntryDraft'
import { usdAmountFromNumber } from './monetaryAmount'

/**
 * Attach the Safe overview's P&L of each swap to that swap's legs, so the exchange books the
 * same amount to Swap P&L (see `prepareSafeExchanges`). A swap the overview does not value
 * keeps the result it realizes.
 */
export function withSafeSwapPnl(
  drafts: readonly JournalEntryDraft[],
  swaps: readonly Pick<SafeSwapExchange, 'txHash' | 'pnlContributionUsd'>[]
): JournalEntryDraft[] {
  const pnlByTxHash = new Map(
    swaps.flatMap(({ txHash, pnlContributionUsd }) =>
      pnlContributionUsd === null
        ? []
        : [[txHash.toLowerCase(), usdAmountFromNumber(pnlContributionUsd)] as const]
    )
  )
  return drafts.map((entry) => {
    const swapPnl =
      entry.useCase === 'SAFE-SWAP' ? pnlByTxHash.get(entry.txHash?.toLowerCase() ?? '') : undefined
    return swapPnl === undefined ? entry : { ...entry, swapPnl }
  })
}

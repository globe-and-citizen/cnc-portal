/** Safe swap fees on journal drafts: lookup targets, attachment and USD valuation. */
import { zeroAddress } from 'viem'
import { getTokenAddress, isSupportedTokenId } from '@/utils/tokens/metadata'
import type { SwapFeeAmount, SwapFeeTarget } from '@/types/swapFees'
import { swapConsiderationEntries } from './toUsd'
import { usdAmountFromToken, usdRateFromNumber } from './monetaryAmount'
import type { JournalEntryDraft } from './journalEntryDraft'

const SAFE = 'Cash — Safe'

const tokenAddressOf = (entry: Pick<JournalEntryDraft, 'token' | 'asset'>) =>
  (
    entry.asset?.address ??
    (isSupportedTokenId(entry.token) ? getTokenAddress(entry.token) : undefined) ??
    zeroAddress
  ).toLowerCase()

/** One target per Safe swap, read straight from its drafts; newest first. */
export function swapFeeTargets(drafts: readonly JournalEntryDraft[]): SwapFeeTarget[] {
  const swaps = new Map<string, JournalEntryDraft[]>()
  for (const entry of drafts) {
    if (entry.useCase !== 'SAFE-SWAP' || !entry.txHash || !entry.sourceContract) continue
    if (entry.debit !== SAFE && entry.credit !== SAFE) continue
    const key = entry.txHash.toLowerCase()
    swaps.set(key, [...(swaps.get(key) ?? []), entry])
  }
  return [...swaps]
    .map(([txHash, entries]) => ({
      txHash,
      safeAddress: entries[0]!.sourceContract!.toLowerCase(),
      timestamp: entries[0]!.timestamp,
      assets: entries.map((entry) => ({
        address: tokenAddressOf(entry),
        token: entry.token,
        ...(entry.asset ? { asset: entry.asset } : {}),
        rawAmount: entry.rawAmount,
        side: entry.credit === SAFE ? ('spent' as const) : ('received' as const)
      }))
    }))
    .sort((left, right) => right.timestamp - left.timestamp)
}

export function attachSwapFees(
  drafts: readonly JournalEntryDraft[],
  fees: ReadonlyMap<string, SwapFeeAmount>
): JournalEntryDraft[] {
  return drafts.map((entry) => {
    const swapFee =
      entry.useCase === 'SAFE-SWAP' && entry.txHash
        ? fees.get(entry.txHash.toLowerCase())
        : undefined
    return swapFee ? { ...entry, swapFee } : entry
  })
}

/**
 * USD value of the attached fee at the swap's own execution ratio. A stablecoin receipt
 * is already net, so it is never reduced a second time. Zero keeps the fee inside the
 * asset cost: no fee, a fee in a third currency, or a fee larger than the movement.
 */
export function executedFeeUsd(entries: readonly JournalEntryDraft[]): bigint {
  const fee = entries.find((entry) => entry.swapFee)?.swapFee
  const consideration = swapConsiderationEntries(entries)
  if (
    !fee ||
    BigInt(fee.rawAmount) === 0n ||
    !consideration.length ||
    consideration.some((entry) => !((entry.rate ?? 0) > 0))
  )
    return 0n
  const amount = BigInt(fee.rawAmount)
  const value = consideration.reduce(
    (sum, entry) =>
      sum +
      usdAmountFromToken(
        BigInt(entry.rawAmount),
        entry.token,
        usdRateFromNumber(entry.rate!),
        entry.asset
      ),
    0n
  )
  const receiptAnchored = consideration[0]!.debit === SAFE
  const outgoing = entries.filter((entry) => entry.credit === SAFE)
  const incoming = entries.filter((entry) => entry.debit === SAFE)
  const total = (side: JournalEntryDraft[]) =>
    side.reduce((sum, entry) => sum + BigInt(entry.rawAmount), 0n)
  const inToken = (side: JournalEntryDraft[]) =>
    side.every((entry) => tokenAddressOf(entry) === fee.tokenAddress)
  if (inToken(outgoing)) {
    const spent = total(outgoing)
    if (spent <= amount) return 0n
    return (value * amount) / (receiptAnchored ? spent - amount : spent)
  }
  if (inToken(incoming)) {
    const received = total(incoming)
    if (received <= 0n) return 0n
    return (value * amount) / (receiptAnchored ? received : received + amount)
  }
  return 0n
}

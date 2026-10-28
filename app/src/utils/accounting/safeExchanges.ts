/** Replay Safe carrying values and balance evidenced asset exchanges without creating service revenue. */
import { assetDecimals, type AssetId } from '@/utils/tokens/assets'
import { makeJournalEntryDraft, type JournalEntryDraft } from './journalEntryDraft'
import { usdAmountFromToken, usdRateFromNumber, usdAmountToNumber } from './monetaryAmount'
import { round6, wholeTokenAmount } from './toUsd'

interface Holding {
  quantity: bigint
  amount: bigint
  complete: boolean
}

function marketAmount(entry: JournalEntryDraft): bigint {
  return usdAmountFromToken(
    BigInt(entry.rawAmount),
    entry.token,
    usdRateFromNumber(entry.rate ?? 0),
    entry.asset
  )
}

/**
 * Market value of the fees CoW Protocol took from a swap's sold legs. Read it before the legs
 * are re-rated at their carrying cost, so the fee keeps the swap day's market price.
 */
function swapFeeAmount(outgoing: readonly JournalEntryDraft[]): bigint {
  return outgoing.reduce(
    (sum, entry) =>
      entry.feeRawAmount ? sum + marketAmount({ ...entry, rawAmount: entry.feeRawAmount }) : sum,
    0n
  )
}

/** A USD-only line added to a swap's operation: its transaction fee or its exchange result. */
function swapUsdLineDraft(
  primary: JournalEntryDraft,
  line: {
    suffix: string
    debit: JournalEntryDraft['debit']
    credit: JournalEntryDraft['credit']
    amount: bigint
    memo: string
  }
): JournalEntryDraft {
  return makeJournalEntryDraft({
    id: `${primary.id}-${line.suffix}`,
    txHash: primary.txHash,
    sourceOperationId: primary.sourceOperationId,
    timestamp: primary.timestamp,
    useCase: 'SAFE-SWAP',
    debit: line.debit,
    credit: line.credit,
    token: 'usdc',
    rawAmount: '0',
    rate: 1,
    carryingAmount: line.amount,
    memo: line.memo
  })
}

/**
 * Full-history weighted-average carrying basis, replayed on every source/rate refresh.
 *
 * A fee CoW Protocol reports is valued at the sold token's market rate and booked as
 * Transaction Fee Expense, so the exchange gain or loss excludes it like the Safe's swap
 * overview does; together they still equal proceeds less carrying value.
 *
 * Within one operation, non-exchange entries (e.g. a same-operation mint) are applied
 * first as ordinary evidence — never as another swap receipt. A non-exchange depletion
 * that disagrees with its market price cannot establish a weighted acquisition basis for
 * a later swap, so it marks that holding incomplete.
 */
export function prepareSafeExchanges(drafts: readonly JournalEntryDraft[]): JournalEntryDraft[] {
  const holdings = new Map<AssetId, Holding>()
  const operations = new Map<string, JournalEntryDraft[]>()
  for (const entry of [...drafts].sort(
    (a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id)
  )) {
    const key = entry.txHash?.toLowerCase() ?? entry.sourceOperationId ?? entry.id
    const group = operations.get(key) ?? []
    group.push({ ...entry })
    operations.set(key, group)
  }
  const result: JournalEntryDraft[] = []
  const add = (entry: JournalEntryDraft) => {
    if (entry.debit !== 'Cash — Safe') return
    const holding = holdings.get(entry.token) ?? { quantity: 0n, amount: 0n, complete: true }
    const amount = entry.carryingAmount ?? marketAmount(entry)
    holding.quantity += BigInt(entry.rawAmount)
    holding.amount += amount
    holding.complete &&=
      BigInt(entry.rawAmount) === 0n ||
      ((entry.rate ?? 0) > 0 &&
        assetDecimals(entry.token, entry.asset) !== null &&
        entry.accountingIssue !== 'exchange-basis-unavailable')
    holdings.set(entry.token, holding)
  }
  const remove = (entry: JournalEntryDraft, exchange: boolean): bigint | null => {
    if (entry.credit !== 'Cash — Safe') return null
    const quantity = BigInt(entry.rawAmount)
    const holding = holdings.get(entry.token)
    const evidenced =
      holding && holding.complete && holding.quantity >= quantity && holding.quantity > 0n
    const amount = evidenced ? (holding.amount * quantity) / holding.quantity : null
    if (exchange && amount !== null) {
      entry.carryingAmount = amount
      const units = wholeTokenAmount(quantity, entry.token, entry.asset)
      if (units > 0) entry.rate = round6(usdAmountToNumber(amount) / units)
    }
    if (holding) {
      holding.quantity -= quantity
      holding.amount -= exchange && amount !== null ? amount : marketAmount(entry)
      if (!exchange && (amount === null || amount !== marketAmount(entry))) holding.complete = false
      if (holding.quantity < 0n || holding.amount < 0n) holding.complete = false
    }
    return amount
  }
  for (const group of operations.values()) {
    const exchange = group.filter((entry) => entry.useCase === 'SAFE-SWAP')
    const other = group.filter((entry) => entry.useCase !== 'SAFE-SWAP')
    for (const entry of other) {
      add(entry)
      remove(entry, false)
    }
    if (!exchange.length) {
      result.push(...group)
      continue
    }
    const incoming = exchange.filter((entry) => entry.debit === 'Cash — Safe')
    const outgoing = exchange.filter((entry) => entry.credit === 'Cash — Safe')
    const fee = swapFeeAmount(outgoing)
    let basis = 0n
    let complete = incoming.every(
      (entry) =>
        (entry.rate ?? 0) > 0 &&
        assetDecimals(entry.token, entry.asset) !== null &&
        entry.asset?.trusted !== false
    )
    for (const entry of outgoing) {
      const amount = remove(entry, true)
      if (amount === null) complete = false
      else basis += amount
    }
    if (!complete) {
      for (const entry of exchange) {
        entry.accountingIssue ??= 'exchange-basis-unavailable'
        entry.carryingAmount = 0n
      }
    } else {
      const received = incoming.reduce(
        (sum, entry) => sum + (entry.carryingAmount ?? marketAmount(entry)),
        0n
      )
      const delta = received + fee - basis
      if (fee > 0n)
        group.push(
          swapUsdLineDraft(incoming[0]!, {
            suffix: 'transaction-fee',
            debit: 'Transaction Fee Expense',
            credit: null,
            amount: fee,
            memo: 'Transaction fee CoW Protocol took from the asset given up'
          })
        )
      if (delta !== 0n)
        group.push(
          swapUsdLineDraft(incoming[0]!, {
            suffix: 'exchange-result',
            debit: delta < 0n ? 'Asset Exchange Loss' : null,
            credit: delta > 0n ? 'Asset Exchange Gain' : null,
            amount: delta < 0n ? -delta : delta,
            memo: 'Asset exchange proceeds less weighted-average carrying value, excluding the fee'
          })
        )
    }
    for (const entry of incoming) add(entry)
    result.push(...group)
  }
  return result
}

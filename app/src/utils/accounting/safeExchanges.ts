/** Replay Safe carrying values and balance evidenced asset exchanges without creating service revenue. */
import type { AssetId } from '@/utils/tokens/assets'
import { assetDecimals } from '@/utils/tokens/assets'
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

/** Full-history weighted-average carrying basis, replayed on every source/rate refresh. */
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
      // Other payments retain their existing transaction-price policy. A differing
      // depletion cannot establish a weighted acquisition basis for a later swap.
      if (!exchange && (amount === null || amount !== marketAmount(entry))) holding.complete = false
      if (holding.quantity < 0n || holding.amount < 0n) holding.complete = false
    }
    return amount
  }
  for (const group of operations.values()) {
    const exchange = group.filter((entry) => entry.useCase === 'SAFE-SWAP')
    const other = group.filter((entry) => entry.useCase !== 'SAFE-SWAP')
    // Same-operation token mints are separate evidence, not another swap receipt.
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
      const delta = received - basis
      if (delta !== 0n) {
        const primary = incoming[0]!
        group.push(
          makeJournalEntryDraft({
            id: `${primary.id}-exchange-result`,
            txHash: primary.txHash,
            sourceOperationId: primary.sourceOperationId,
            timestamp: primary.timestamp,
            useCase: 'SAFE-SWAP',
            debit: delta < 0n ? 'Asset Exchange Loss' : null,
            credit: delta > 0n ? 'Asset Exchange Gain' : null,
            token: 'usdc',
            rawAmount: '0',
            rate: 1,
            carryingAmount: delta < 0n ? -delta : delta,
            memo: 'Asset exchange proceeds less weighted-average carrying value'
          })
        )
      }
    }
    for (const entry of incoming) add(entry)
    result.push(...group)
  }
  return result
}

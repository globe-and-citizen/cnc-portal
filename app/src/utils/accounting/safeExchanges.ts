/** Replay Safe carrying values and balance evidenced asset exchanges without creating service revenue. */
import { assetDecimals, type AssetId } from '@/utils/tokens/assets'
import {
  compareDraftOrder,
  makeJournalEntryDraft,
  type JournalEntryDraft
} from './journalEntryDraft'
import { usdAmountFromToken, usdRateFromNumber } from './monetaryAmount'
import { swapConsiderationEntries } from './toUsd'
import { executedFeeUsd } from './swapFees'

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

/** Keep the amount exact; the derived six-decimal unit rate is presentation evidence only. */
function setCarryingValue(
  entry: JournalEntryDraft,
  amount: bigint,
  method: NonNullable<JournalEntryDraft['valuationMethod']>
) {
  entry.carryingAmount = amount
  entry.valuationMethod = method
  const decimals = assetDecimals(entry.token, entry.asset)
  const quantity = BigInt(entry.rawAmount)
  if (decimals === null || quantity <= 0n) return
  const divisor = quantity * 10n ** 18n
  entry.carryingRate = (amount * 10n ** BigInt(decimals) + divisor / 2n) / divisor
}

/**
 * Full-history weighted-average carrying basis, replayed on every source/rate refresh.
 *
 * Within one operation, non-exchange entries (e.g. a same-operation mint) are applied
 * first as ordinary evidence — never as another swap receipt. A non-exchange depletion
 * that disagrees with its market price cannot establish a weighted acquisition basis for
 * a later swap, so it marks that holding incomplete.
 *
 * A swap is valued at its executed consideration, read before the disposed asset is
 * replaced by its historic cost. A verified fee is split out as Transaction Fee Expense;
 * without one the fee stays inside the acquired asset cost. Returns drafts in replay order.
 */
export function prepareSafeExchanges(drafts: readonly JournalEntryDraft[]): JournalEntryDraft[] {
  const holdings = new Map<AssetId, Holding>()
  const operations = new Map<string, JournalEntryDraft[]>()
  for (const entry of [...drafts].sort(compareDraftOrder)) {
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
      (((entry.rate ?? 0) > 0 || entry.valuationMethod !== undefined) &&
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
      setCarryingValue(entry, amount, 'weighted-average')
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
    const consideration = swapConsiderationEntries(exchange)
    const received = consideration.reduce((sum, entry) => sum + marketAmount(entry), 0n)
    const fee = executedFeeUsd(exchange)
    const receiptAnchored = consideration[0]?.debit === 'Cash — Safe'
    const netReceived = receiptAnchored ? received : received - fee
    const proceeds = receiptAnchored ? received + fee : received
    let basis = 0n
    let complete =
      consideration.length > 0 &&
      netReceived > 0n &&
      consideration.every((entry) => (entry.rate ?? 0) > 0) &&
      exchange.every(
        (entry) =>
          BigInt(entry.rawAmount) > 0n &&
          assetDecimals(entry.token, entry.asset) !== null &&
          entry.asset?.trusted !== false &&
          !entry.accountingIssue
      )
    for (const entry of outgoing) {
      if (entry.accountingIssue) complete = false
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
      const quantity = incoming.reduce((sum, entry) => sum + BigInt(entry.rawAmount), 0n)
      let allocated = 0n
      incoming.forEach((entry, index) => {
        const amount =
          index === incoming.length - 1
            ? netReceived - allocated
            : (netReceived * BigInt(entry.rawAmount)) / quantity
        allocated += amount
        setCarryingValue(entry, amount, 'swap-consideration')
      })
      if (fee > 0n) {
        const primary = incoming[0]!
        group.push(
          makeJournalEntryDraft({
            id: `${primary.id}-swap-fee`,
            txHash: primary.txHash,
            ...(primary.logIndex !== undefined ? { logIndex: primary.logIndex } : {}),
            sourceOperationId: primary.sourceOperationId,
            timestamp: primary.timestamp,
            useCase: 'SAFE-SWAP',
            debit: 'Transaction Fee Expense',
            credit: null,
            token: 'usdc',
            rawAmount: '0',
            rate: 1,
            carryingAmount: fee,
            memo: 'Executed swap fee'
          })
        )
      }
      const delta = proceeds - basis
      if (delta !== 0n) {
        const primary = incoming[0]!
        group.push(
          makeJournalEntryDraft({
            id: `${primary.id}-exchange-result`,
            txHash: primary.txHash,
            ...(primary.logIndex !== undefined ? { logIndex: primary.logIndex } : {}),
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
  return result.sort(compareDraftOrder)
}

/**
 * Report-date market revaluation of the Safe. The journal keeps historical cost; a report
 * adds adjusting entries so the Safe shows its market value at the report's date. The
 * difference goes to `Safe Market Value Adjustment` and `Unrealized P&L`: a loss is a debit
 * of `Unrealized P&L`, a gain a credit. These
 * entries are computed for each report and are never stored or posted on-chain.
 */
import { assetDecimals, type AssetId, type AssetMetadata } from '@/utils/tokens/assets'
import { accountFor } from './accountRegistry'
import { createJournalEntry } from './journalEntry'
import { usdAmountFromToken, usdRateFromNumber } from './monetaryAmount'
import { isUsdPegged } from './toUsd'
import type { JournalEntry, JournalEntryLine, UsdAmount } from './types'

export interface SafePosition {
  token: AssetId
  asset?: AssetMetadata
  quantity: bigint
  cost: UsdAmount
}

export interface RevaluationPoint {
  timestamp: number
  /** Cumulative market value less carrying cost of the Safe at `timestamp`. */
  adjustment: UsdAmount
}

/** Non-pegged Safe holdings and their carrying cost at a time, read from the journal alone. */
export function safePositionsAt(journal: readonly JournalEntry[], at: number): SafePosition[] {
  const positions = new Map<AssetId, SafePosition>()
  for (const entry of journal) {
    if (entry.timestamp > at || entry.useCase === 'MARKET-REVALUATION') continue
    for (const line of entry.lines) {
      const movement = line.movement
      if (line.account.family.name !== 'Cash — Safe' || !movement || isUsdPegged(movement.token))
        continue
      const position = positions.get(movement.token) ?? {
        token: movement.token,
        ...(movement.asset ? { asset: movement.asset } : {}),
        quantity: 0n,
        cost: 0n
      }
      position.quantity += line.debit !== undefined ? movement.rawAmount : -movement.rawAmount
      position.cost += (line.debit ?? 0n) - (line.credit ?? 0n)
      positions.set(movement.token, position)
    }
  }
  return [...positions.values()].filter((position) => position.quantity !== 0n || position.cost)
}

/** Market value less cost of every position; null when a held token has no usable price. */
export function revaluationOf(
  positions: readonly SafePosition[],
  priceOf: (token: AssetId) => number
): UsdAmount | null {
  let total = 0n
  for (const position of positions) {
    if (position.quantity === 0n) {
      total -= position.cost
      continue
    }
    const price = priceOf(position.token)
    if (!(price > 0) || assetDecimals(position.token, position.asset) === null) return null
    const market = usdAmountFromToken(
      position.quantity,
      position.token,
      usdRateFromNumber(price),
      position.asset
    )
    total += market - position.cost
  }
  return total
}

/** Incremental adjusting entries, so a reporting period only sees its own change in value. */
export function revaluationEntries(points: readonly RevaluationPoint[]): JournalEntry[] {
  let previous = 0n
  return [...points]
    .sort((left, right) => left.timestamp - right.timestamp)
    .flatMap(({ timestamp, adjustment }) => {
      const change = adjustment - previous
      previous = adjustment
      if (change === 0n) return []
      const gain = change > 0n
      const amount = gain ? change : -change
      const id = `market-revaluation:${timestamp}`
      const valueLine = {
        id: `${id}:adjustment`,
        account: accountFor('Safe Market Value Adjustment'),
        ...(gain ? { debit: amount } : { credit: amount })
      } as JournalEntryLine
      const resultLine = {
        id: `${id}:result`,
        account: accountFor('Unrealized P&L'),
        ...(gain ? { credit: amount } : { debit: amount })
      } as JournalEntryLine
      return [
        createJournalEntry({
          id,
          sourceOperationId: id,
          timestamp,
          useCase: 'MARKET-REVALUATION',
          memo: 'Safe assets revalued to market value',
          internal: false,
          kind: 'monetary',
          activityAmount: amount,
          lines: gain ? [valueLine, resultLine] : [resultLine, valueLine]
        })
      ]
    })
}

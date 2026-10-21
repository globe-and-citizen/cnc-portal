/** Treasury performance is a projection of the canonical journal, reconciled to exact Safe units. */
import { parseUnits } from 'viem'
import type { SafeClientBalances } from '@/types/safe'
import { currentChainId } from '@/constant'
import { assetIdOfAddress, type AssetId, type AssetMetadata } from '@/utils/tokens/assets'
import { isUnrecognizedSafeHolding } from '@/utils/safe/portfolio'
import { swappedAssets } from '@/utils/tokens/assetRecognition'
import { currencySymbol } from './presenter'
import type { JournalEntry } from './types'
import { isUsdPegged } from './toUsd'

export interface SafePnlPosition {
  token: AssetId
  symbol: string
  asset?: AssetMetadata
  quantity: bigint
  basis: bigint
  realized: bigint
  market: bigint | null
  unrealized: bigint | null
  total: bigint | null
  reason?: string
}

export interface SafePnl {
  fees?: bigint | null
  positions: SafePnlPosition[]
  complete: boolean
  basis: bigint | null
  market: bigint | null
  realized: bigint | null
  unrealized: bigint | null
  total: bigint | null
}

function fiat(value: string | null): bigint | null {
  return value !== null && /^\d+(?:\.\d{1,24})?$/.test(value) ? parseUnits(value, 24) : null
}

export function safeTreasuryPnl(
  journal: readonly JournalEntry[],
  balances: SafeClientBalances | undefined,
  ready: boolean,
  chainId = currentChainId
): SafePnl {
  const positions = new Map<AssetId, SafePnlPosition>()
  const position = (token: AssetId, asset?: AssetMetadata) => {
    let row = positions.get(token)
    if (!row) {
      row = {
        token,
        asset,
        symbol: currencySymbol(token, asset),
        quantity: 0n,
        basis: 0n,
        realized: 0n,
        market: null,
        unrealized: null,
        total: null
      }
      positions.set(token, row)
    }
    return row
  }
  let attributable = true
  let totalFees = 0n
  for (const entry of journal) {
    const cash = entry.lines.filter((line) => line.account.family.name === 'Cash — Safe')
    for (const line of cash) {
      if (!line.movement) {
        attributable = false
        continue
      }
      const row = position(line.movement.token, line.movement.asset)
      if (entry.internal && !isUsdPegged(row.token))
        row.reason = 'Internal transfer cost needs reconciliation'
      if (
        line.credit !== undefined &&
        entry.useCase !== 'SAFE-SWAP' &&
        (row.quantity <= 0n || line.credit !== (row.basis * line.movement.rawAmount) / row.quantity)
      )
        row.reason = 'Disposal cost needs reconciliation'
      row.quantity += (line.debit !== undefined ? 1n : -1n) * line.movement.rawAmount
      row.basis += (line.debit ?? 0n) - (line.credit ?? 0n)
      if (
        (line.movement.rate <= 0n && !line.movement.valuationMethod) ||
        line.movement.decimals === null
      )
        row.reason = 'Cost basis unavailable'
    }
    if (entry.useCase !== 'SAFE-SWAP') continue
    const result = entry.lines
      .filter((line) =>
        ['Asset Exchange Gain', 'Asset Exchange Loss'].includes(line.account.family.name)
      )
      .reduce((sum, line) => sum + (line.credit ?? 0n) - (line.debit ?? 0n), 0n)
    const disposed = new Set(
      cash
        .filter((line) => line.credit !== undefined && line.movement)
        .map((line) => line.movement!.token)
    )
    if (disposed.size === 1) position([...disposed][0]!).realized += result
    else if (result !== 0n) attributable = false
    const fee = entry.lines
      .filter((line) => line.account.family.name === 'Transaction Fee Expense')
      .reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n)
    totalFees += fee
    const acquired = new Set(
      cash
        .filter((line) => line.debit !== undefined && line.movement)
        .map((line) => line.movement!.token)
    )
    const feeAssets = [...acquired].every(isUsdPegged) ? disposed : acquired
    if (feeAssets.size === 1) position([...feeAssets][0]!).realized -= fee
    else if (fee !== 0n) attributable = false
  }
  const observed = new Map<AssetId, SafeClientBalances['items'][number]>()
  const swapped = swappedAssets(
    journal.flatMap((entry) =>
      entry.lines.flatMap((line) =>
        line.movement ? [{ useCase: entry.useCase, token: line.movement.token }] : []
      )
    )
  )
  for (const item of balances?.items ?? []) {
    if (isUnrecognizedSafeHolding(item, ready ? swapped : undefined, chainId)) continue
    const token =
      item.tokenInfo.type === 'ERC20' ? assetIdOfAddress(item.tokenInfo.address, chainId) : 'native'
    if (observed.has(token)) attributable = false
    observed.set(token, item)
    const row = position(token)
    row.symbol = item.tokenInfo.symbol
  }
  for (const row of positions.values()) {
    const item = observed.get(row.token)
    const raw = item?.balance
    // Absence can represent a closed position only when the journal also holds zero.
    const quantity =
      raw !== undefined && raw !== null && /^\d+$/.test(raw) ? BigInt(raw) : item ? null : 0n
    if (!ready) row.reason = 'Accounting history is incomplete'
    else if (!balances) row.reason = 'Current valuation unavailable'
    else if (quantity !== row.quantity) row.reason = 'Balance and history do not match'
    else if (row.basis < 0n || row.quantity < 0n || (row.quantity === 0n && row.basis !== 0n))
      row.reason = 'Cost basis unavailable'
    row.market =
      quantity === 0n
        ? 0n
        : item && fiat(item.fiatConversion) !== null && Number(item.fiatConversion) > 0
          ? fiat(item.fiatBalance)
          : null
    if (row.market === null) row.reason ??= 'Current price unavailable'
    if (!row.reason && row.market !== null) {
      row.unrealized = row.market - row.basis
      row.total = row.realized + row.unrealized
    }
  }
  const rows = [...positions.values()]
  const complete = ready && !!balances && attributable && rows.every((row) => row.total !== null)
  const sum = (field: 'basis' | 'market' | 'realized' | 'unrealized' | 'total') =>
    complete ? rows.reduce((total, row) => total + (row[field] ?? 0n), 0n) : null
  return {
    positions: rows,
    fees: ready ? totalFees : null,
    complete,
    basis: sum('basis'),
    market: sum('market'),
    realized: sum('realized'),
    unrealized: sum('unrealized'),
    total: sum('total')
  }
}

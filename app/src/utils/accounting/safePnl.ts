/**
 * Safe P&L, token by token, rebuilt from the accounting journal and checked against the Safe's live balances.
 *
 * For each token, total P&L = realized + unrealized:
 * - realized is the gain or loss already locked in by the Safe's swaps, minus their fees;
 * - unrealized is today's market value minus what the remaining quantity cost.
 *
 * 1. {@link replayJournal} replays every `Cash — Safe` movement to know each token's quantity and remaining
 *    cost, and credits each swap's result and fee to the token involved.
 * 2. {@link observeBalances} reads the Safe's current company holdings (unsolicited tokens are left out).
 * 3. {@link valuePosition} values each token at today's price only when its quantity matches the journal;
 *    otherwise it keeps a plain reason and no total.
 *
 * Safe totals are returned only when every token reconciles.
 */
import { parseUnits } from 'viem'
import type { SafeClientBalances } from '@/types/safe'
import { currentChainId } from '@/constant'
import { assetIdOfAddress, type AssetId, type AssetMetadata } from '@/utils/tokens/assets'
import { isUnrecognizedSafeHolding } from '@/utils/safe/portfolio'
import { swappedAssets } from '@/utils/tokens/assetRecognition'
import { currencySymbol } from './presenter'
import type { JournalEntry, JournalEntryLine } from './types'
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

type Positions = Map<AssetId, SafePnlPosition>
type SafeBalance = SafeClientBalances['items'][number]

const SAFE_CASH = 'Cash — Safe'
const EXCHANGE_RESULT = ['Asset Exchange Gain', 'Asset Exchange Loss']
const SWAP_FEE = 'Transaction Fee Expense'

function fiat(value: string | null): bigint | null {
  return value !== null && /^\d+(?:\.\d{1,24})?$/.test(value) ? parseUnits(value, 24) : null
}

function positionOf(positions: Positions, token: AssetId, asset?: AssetMetadata): SafePnlPosition {
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

/** Net credit of an entry's lines on the given accounts. */
function netCredit(entry: JournalEntry, accounts: readonly string[]): bigint {
  return entry.lines
    .filter((line) => accounts.includes(line.account.family.name))
    .reduce((sum, line) => sum + (line.credit ?? 0n) - (line.debit ?? 0n), 0n)
}

function tokensOf(lines: readonly JournalEntryLine[], side: 'debit' | 'credit'): Set<AssetId> {
  return new Set(
    lines.filter((line) => line[side] !== undefined && line.movement).map((l) => l.movement!.token)
  )
}

/** Move one Safe cash line into its token's quantity and remaining cost, flagging what cannot be trusted. */
function applyMovement(
  row: SafePnlPosition,
  entry: JournalEntry,
  line: JournalEntryLine & { movement: NonNullable<JournalEntryLine['movement']> }
): void {
  const { movement } = line
  if (entry.internal && !isUsdPegged(row.token))
    row.reason = 'Internal transfer cost needs reconciliation'
  if (
    line.credit !== undefined &&
    entry.useCase !== 'SAFE-SWAP' &&
    (row.quantity <= 0n || line.credit !== (row.basis * movement.rawAmount) / row.quantity)
  )
    row.reason = 'Disposal cost needs reconciliation'
  row.quantity += (line.debit !== undefined ? 1n : -1n) * movement.rawAmount
  row.basis += (line.debit ?? 0n) - (line.credit ?? 0n)
  if ((movement.rate <= 0n && !movement.valuationMethod) || movement.decimals === null)
    row.reason = 'Cost basis unavailable'
}

/** Per-token quantity, remaining cost and realized swap result, from the journal alone. */
function replayJournal(journal: readonly JournalEntry[]) {
  const positions: Positions = new Map()
  let attributable = true
  let fees = 0n
  for (const entry of journal) {
    const cash = entry.lines.filter((line) => line.account.family.name === SAFE_CASH)
    for (const line of cash) {
      if (line.movement)
        applyMovement(positionOf(positions, line.movement.token, line.movement.asset), entry, {
          ...line,
          movement: line.movement
        })
      else attributable = false
    }
    if (entry.useCase !== 'SAFE-SWAP') continue
    const disposed = tokensOf(cash, 'credit')
    const acquired = tokensOf(cash, 'debit')
    const result = netCredit(entry, EXCHANGE_RESULT)
    const fee = -netCredit(entry, [SWAP_FEE])
    fees += fee
    if (disposed.size === 1) positionOf(positions, [...disposed][0]!).realized += result
    else if (result !== 0n) attributable = false
    const feeAssets = [...acquired].every(isUsdPegged) ? disposed : acquired
    if (feeAssets.size === 1) positionOf(positions, [...feeAssets][0]!).realized -= fee
    else if (fee !== 0n) attributable = false
  }
  return { positions, attributable, fees }
}

/** The Safe's current company holdings by token; a token reported twice cannot be attributed. */
function observeBalances(
  positions: Positions,
  journal: readonly JournalEntry[],
  balances: SafeClientBalances | undefined,
  ready: boolean,
  chainId: typeof currentChainId
) {
  const items = new Map<AssetId, SafeBalance>()
  let attributable = true
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
    if (items.has(token)) attributable = false
    items.set(token, item)
    positionOf(positions, token).symbol = item.tokenInfo.symbol
  }
  return { items, attributable }
}

/**
 * Value one token at today's price when its live quantity matches the journal. A token absent from the
 * balances counts as a closed position only when the journal also holds zero of it.
 */
function valuePosition(
  row: SafePnlPosition,
  item: SafeBalance | undefined,
  ready: boolean,
  hasBalances: boolean
): void {
  const raw = item?.balance
  const quantity =
    raw !== undefined && raw !== null && /^\d+$/.test(raw) ? BigInt(raw) : item ? null : 0n
  if (!ready) row.reason = 'Accounting history is incomplete'
  else if (!hasBalances) row.reason = 'Current valuation unavailable'
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

export function safeTreasuryPnl(
  journal: readonly JournalEntry[],
  balances: SafeClientBalances | undefined,
  ready: boolean,
  chainId = currentChainId
): SafePnl {
  const replay = replayJournal(journal)
  const observed = observeBalances(replay.positions, journal, balances, ready, chainId)
  for (const row of replay.positions.values())
    valuePosition(row, observed.items.get(row.token), ready, !!balances)
  const rows = [...replay.positions.values()]
  const complete =
    ready &&
    !!balances &&
    replay.attributable &&
    observed.attributable &&
    rows.every((row) => row.total !== null)
  const sum = (field: 'basis' | 'market' | 'realized' | 'unrealized' | 'total') =>
    complete ? rows.reduce((total, row) => total + (row[field] ?? 0n), 0n) : null
  return {
    positions: rows,
    fees: ready ? replay.fees : null,
    complete,
    basis: sum('basis'),
    market: sum('market'),
    realized: sum('realized'),
    unrealized: sum('unrealized'),
    total: sum('total')
  }
}

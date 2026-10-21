/** Display labels for the Safe P&L and its per-token column in the holdings table. */
import { currentChainId } from '@/constant'
import { assetId, knownAssetId, type AssetId } from '@/utils/tokens/assets'
import type { TokenHoldingRow } from '@/utils/tokens/holdings'
import { money } from './presenter'
import type { SafePnl, SafePnlPosition } from './safePnl'

export function pnlLabel(value: bigint | null): string {
  return value === null ? 'Unavailable' : `${value > 0n ? '+' : ''}${money(value)}`
}

function positionPnl(position?: SafePnlPosition): NonNullable<TokenHoldingRow['pnl']> {
  return {
    label: pnlLabel(position?.total ?? null),
    details:
      position?.reason ??
      (position
        ? `Remaining cost ${money(position.basis)} · realized ${pnlLabel(position.realized)} (fees included) · unrealized ${pnlLabel(position.unrealized)}`
        : 'Cost basis unavailable'),
    positive: (position?.total ?? 0n) > 0n,
    negative: (position?.total ?? 0n) < 0n
  }
}

/** Retain closed positions so their realized result does not disappear with the balance. */
export function withSafePnlRows(rows: TokenHoldingRow[], pnl: SafePnl): TokenHoldingRow[] {
  const represented = new Set<AssetId>()
  const result = rows.map((row) => {
    const token = row.address
      ? (knownAssetId(row.address) ?? assetId(row.address, currentChainId))
      : 'native'
    represented.add(token)
    const position = pnl.positions.find((position) => position.token === token)
    return { ...row, pnl: positionPnl(position) }
  })
  for (const position of pnl.positions) {
    if (represented.has(position.token) || (position.quantity === 0n && position.realized === 0n))
      continue
    const closed = position.quantity === 0n
    result.push({
      rank: result.length + 1,
      token: { name: position.symbol, symbol: position.symbol },
      name: position.symbol,
      address: position.asset?.address,
      icon: null,
      quantity: closed ? '0' : 'Unavailable',
      amountLabel: closed ? '0' : 'Unavailable',
      amount: closed ? 0 : null,
      price: null,
      priceLabel: '—',
      balance: closed ? 0 : null,
      balanceLabel: closed ? 'Closed' : 'Unavailable',
      pnl: positionPnl(position)
    })
  }
  return result
}

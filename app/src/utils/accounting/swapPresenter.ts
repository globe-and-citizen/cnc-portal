/** Display rows for Safe swaps: fee panels and the ledger's execution details. */
import { formatUnits } from 'viem'
import { assetDecimals } from '@/utils/tokens/assets'
import { formatExactNumber, formatNumber, formatToken } from '@/utils/format'
import type { SwapFeeTarget, SwapFeeVerification } from '@/types/swapFees'
import { currencySymbol, formatUnixDateTime, money } from './presenter'
import { isUsdPegged } from './toUsd'
import type { JournalEntry } from './types'

export interface SwapFeeRow {
  label: string
  amount: string
  compactAmount: string
  description?: string
  tokenAddress: string
  /** Value in the spent currency at the swap's own execution price, e.g. `≈ 3.73 USDC`. */
  equivalent?: string
}

export interface SwapFeePresentation {
  totals: SwapFeeRow[]
  breakdown: SwapFeeRow[]
  /** Sum of the breakdown, shown when it is reported in a single currency. */
  breakdownTotal?: SwapFeeRow
  /** Where the fee was taken from, in plain words. */
  withheld?: string
  reason?: string
}

interface SwapSide {
  address: string
  symbol: string
  decimals: number | null
  raw: bigint
}

/** Single-currency side of the swap; a mixed side has no unambiguous price. */
function sideOf(target: SwapFeeTarget, side: 'spent' | 'received'): SwapSide | undefined {
  const assets = target.assets.filter((asset) => asset.side === side)
  if (!assets.length || new Set(assets.map((asset) => asset.address)).size !== 1) return undefined
  const { address, token, asset } = assets[0]!
  return {
    address,
    symbol: currencySymbol(token, asset),
    decimals: assetDecimals(token, asset),
    raw: assets.reduce((sum, asset) => sum + BigInt(asset.rawAmount), 0n)
  }
}

/** Two decimals is enough for an approximate value; a positive dust value keeps a bound. */
function roughAmount(raw: bigint, symbol: string, decimals: number): string {
  const quantity = formatUnits(raw, decimals)
  return raw > 0n && formatNumber(quantity, { maxDecimals: 2 }) === '0'
    ? `< ${formatToken(0.01, symbol, { maxDecimals: 2 })}`
    : formatToken(quantity, symbol, { maxDecimals: 2 })
}

export function swapLabel(target: SwapFeeTarget): string {
  const symbols = (side: 'spent' | 'received') =>
    [
      ...new Set(
        target.assets
          .filter((asset) => asset.side === side)
          .map((asset) => currencySymbol(asset.token, asset.asset))
      )
    ].join(' + ')
  return `${symbols('spent')} → ${symbols('received')}`
}

export const swapDate = (target: SwapFeeTarget) => formatUnixDateTime(target.timestamp)

/** Exact units by default; compact display preserves nonzero fees and unknown decimals. */
export function swapFeeAmount(
  raw: string,
  symbol: string,
  decimals: number | null,
  maxDecimals?: number
): string {
  if (decimals === null) return `${raw} base units (${symbol})`
  const quantity = formatUnits(BigInt(raw), decimals)
  if (maxDecimals === undefined) return `${formatExactNumber(quantity)} ${symbol}`
  const precision = maxDecimals === 2 && Number(quantity) < 1 ? 8 : maxDecimals
  if (BigInt(raw) > 0n && formatNumber(quantity, { maxDecimals: precision }) === '0') {
    return `< ${formatToken(10 ** -precision, symbol, { maxDecimals: precision })}`
  }
  return formatToken(quantity, symbol, { maxDecimals: precision })
}

function feeRow(
  target: SwapFeeTarget,
  label: string,
  tokenAddress: string,
  raw: string,
  description?: string,
  maxDecimals = 8
): SwapFeeRow {
  const asset = target.assets.find((asset) => asset.address === tokenAddress)
  const symbol = asset ? currencySymbol(asset.token, asset.asset) : tokenAddress
  const decimals = asset ? assetDecimals(asset.token, asset.asset) : null
  return {
    label,
    tokenAddress,
    amount: swapFeeAmount(raw, symbol, decimals),
    compactAmount: swapFeeAmount(raw, symbol, decimals, maxDecimals),
    description
  }
}

function feePolicy(policy: Record<string, unknown>): { label: string; description: string } {
  if ('priceImprovement' in policy)
    return {
      label: 'Better-price fee',
      description: 'A share of the improvement over CoW’s reference quote.'
    }
  if ('surplus' in policy)
    return {
      label: 'Surplus fee',
      description: 'A fee based on execution better than the order’s price limit.'
    }
  const volume = policy.volume as { factor?: unknown } | undefined
  if (volume && typeof volume.factor === 'number' && Number.isFinite(volume.factor))
    return {
      label: `Volume-based fee (${formatNumber(volume.factor * 100, { maxDecimals: 6 })}%)`,
      description: 'A percentage of the amount exchanged.'
    }
  return { label: 'Protocol fee', description: 'A fee reported by the swap provider.' }
}

/**
 * Fees withheld from the received currency are valued at the price before they were withheld,
 * spent ÷ (received + withheld), so the breakdown adds up to the provider's total.
 */
export function presentSwapFees(
  target: SwapFeeTarget,
  verification: SwapFeeVerification
): SwapFeePresentation {
  const spent = sideOf(target, 'spent')
  const received = sideOf(target, 'received')
  const fromReceived = verification.protocolFees.filter(
    (fee) => fee.tokenAddress === received?.address
  )
  const withheld = fromReceived.reduce((sum, fee) => sum + BigInt(fee.rawAmount), 0n)
  const gross = (received?.raw ?? 0n) + withheld
  const equivalentOf = (tokenAddress: string, raw: string) =>
    spent?.decimals != null && tokenAddress === received?.address && gross > 0n
      ? `≈ ${roughAmount((BigInt(raw) * spent.raw) / gross, spent.symbol, spent.decimals)}`
      : undefined
  const breakdown = verification.protocolFees.map((fee) => {
    const policy = feePolicy(fee.policy)
    const row = feeRow(target, policy.label, fee.tokenAddress, fee.rawAmount, policy.description)
    const equivalent = equivalentOf(fee.tokenAddress, fee.rawAmount)
    return equivalent ? { ...row, equivalent } : row
  })
  const sameToken = new Set(verification.protocolFees.map((fee) => fee.tokenAddress)).size === 1
  const total = verification.protocolFees.reduce((sum, fee) => sum + BigInt(fee.rawAmount), 0n)
  const totalToken = verification.protocolFees[0]?.tokenAddress ?? ''
  const totalEquivalent = equivalentOf(totalToken, total.toString())
  const showWithheld =
    received?.decimals != null && withheld > 0n && fromReceived.length === breakdown.length
  return {
    totals: (verification.fees ?? []).map((fee) =>
      feeRow(target, 'Swap fee', fee.tokenAddress, fee.rawAmount, undefined, 2)
    ),
    breakdown,
    ...(sameToken && breakdown.length > 1
      ? {
          breakdownTotal: {
            ...feeRow(target, 'Total', totalToken, total.toString()),
            ...(totalEquivalent ? { equivalent: totalEquivalent } : {})
          }
        }
      : {}),
    ...(showWithheld
      ? {
          withheld: `Withheld from the ${received!.symbol} received: ${swapFeeAmount(received!.raw.toString(), received!.symbol, received!.decimals, 6)} arrived instead of ${swapFeeAmount(gross.toString(), received!.symbol, received!.decimals, 6)}.`
        }
      : {}),
    ...(verification.reason ? { reason: verification.reason } : {})
  }
}

/** How the swap was booked, read from the journal: what the received asset cost and the fee line. */
export function swapBooking(
  journal: readonly JournalEntry[],
  target: SwapFeeTarget
): string | undefined {
  const entry = journal.find(
    (entry) => entry.useCase === 'SAFE-SWAP' && entry.txHash?.toLowerCase() === target.txHash
  )
  const acquired = entry?.lines.filter(
    (line) =>
      line.account.family.name === 'Cash — Safe' &&
      line.debit !== undefined &&
      line.movement?.valuationMethod === 'swap-consideration'
  )
  if (!entry || !acquired?.length) return undefined
  const movement = acquired[0]!.movement!
  const cost = acquired.reduce((sum, line) => sum + line.debit!, 0n)
  const fee = entry.lines
    .filter((line) => line.account.family.name === 'Transaction Fee Expense')
    .reduce((sum, line) => sum + (line.debit ?? 0n), 0n)
  const value = isUsdPegged(movement.token)
    ? `proceeds ${money(cost)}`
    : `${currencySymbol(movement.token, movement.asset)} cost ${money(cost)}`
  return fee > 0n
    ? `In the books: ${value} + swap fee ${money(fee)}.`
    : `In the books: ${value}, fee included (not verified separately).`
}

/** Ratio retained as exact base-unit integers; rounding belongs only to the label. */
export function swapExecutionDetails(entry: JournalEntry): string | undefined {
  if (entry.useCase !== 'SAFE-SWAP') return undefined
  const cash = entry.lines.filter(
    (line) => line.account.family.name === 'Cash — Safe' && line.movement
  )
  const incoming = cash.filter((line) => line.debit !== undefined)
  const outgoing = cash.filter((line) => line.credit !== undefined)
  if (incoming.length !== 1 || outgoing.length !== 1) return undefined
  const received = incoming[0]!.movement!
  const spent = outgoing[0]!.movement!
  if (
    received.decimals === null ||
    spent.decimals === null ||
    received.rawAmount <= 0n ||
    spent.rawAmount <= 0n
  )
    return undefined
  const ratio =
    (spent.rawAmount * 10n ** BigInt(received.decimals + 6)) /
    (received.rawAmount * 10n ** BigInt(spent.decimals))
  const spentSymbol = currencySymbol(spent.token, spent.asset)
  const receivedSymbol = currencySymbol(received.token, received.asset)
  const cost =
    received.valuationMethod === 'swap-consideration' ? money(incoming[0]!.debit!) : 'Unavailable'
  return (
    `Executed: ${ratio === 0n ? '<0.000001' : formatExactNumber(formatUnits(ratio, 6))} ${spentSymbol} / ${receivedSymbol}. ` +
    `Spent ${formatExactNumber(formatUnits(spent.rawAmount, spent.decimals))} ${spentSymbol}; ` +
    `received ${formatExactNumber(formatUnits(received.rawAmount, received.decimals))} ${receivedSymbol}. ` +
    `Acquisition cost: ${cost}. Verified swap fees have their own line; network gas is not included.`
  )
}

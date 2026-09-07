/**
 * Exact fixed-scale monetary values used by the accounting domain.
 *
 * Token prices are recorded with six decimals. Multiplying that rate by the
 * smallest supported token unit (18 decimals for the native token) therefore
 * needs 24 decimal places to preserve every digit without division or rounding.
 */
import type { TokenId } from '@/constant'
import { getTokenDecimals } from '@/utils/tokens/metadata'

/** Decimal places retained for a USD price of one whole token. */
export const USD_RATE_DECIMALS = 6

/** Decimal places retained for every accounting amount. */
export const USD_AMOUNT_DECIMALS = 24

/** USD amount scaled by {@link USD_AMOUNT_DECIMALS}. */
export type UsdAmount = bigint

/** USD-per-token rate scaled by {@link USD_RATE_DECIMALS}. */
export type UsdRate = bigint

export const ZERO_USD_AMOUNT: UsdAmount = 0n

const RATE_SCALE = 10 ** USD_RATE_DECIMALS

function scaledSixDecimalInteger(value: number, label: string): bigint {
  const scaled = Math.round(value * RATE_SCALE)
  if (!Number.isSafeInteger(scaled)) {
    throw new Error(`${label} exceeds the safe six-decimal number range`)
  }
  return BigInt(scaled)
}

/** Convert the existing six-decimal rate-of-record number into its exact integer form. */
export function usdRateFromNumber(rate: number): UsdRate {
  if (!Number.isFinite(rate) || rate < 0)
    throw new Error('USD rate must be finite and non-negative')
  return scaledSixDecimalInteger(rate, 'USD rate')
}

/** Convert an exact rate to a number only for display or transitional source metadata. */
export function usdRateToNumber(rate: UsdRate): number {
  return Number(rate) / RATE_SCALE
}

/**
 * Convert one token movement to USD without losing a base-unit digit.
 *
 * The result has a common 24-decimal scale regardless of the source token.
 */
export function usdAmountFromToken(rawAmount: bigint, tokenId: TokenId, rate: UsdRate): UsdAmount {
  const tokenDecimals = getTokenDecimals(tokenId)
  const scaleDelta = USD_AMOUNT_DECIMALS - tokenDecimals - USD_RATE_DECIMALS
  if (scaleDelta < 0) {
    throw new Error(
      `Token "${tokenId}" requires more than ${USD_AMOUNT_DECIMALS} accounting decimals`
    )
  }
  const absoluteAmount = rawAmount < 0n ? -rawAmount : rawAmount
  return absoluteAmount * rate * 10n ** BigInt(scaleDelta)
}

/** Convert an exact amount to a number only at a presentation or export boundary. */
export function usdAmountToNumber(amount: UsdAmount): number {
  return Number(amount) / 10 ** USD_AMOUNT_DECIMALS
}

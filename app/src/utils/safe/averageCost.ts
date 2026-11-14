/** Weighted-average-cost arithmetic of one token the Safe holds. */

/** What the Safe holds of a token, what it cost, and the result its exits have fixed. */
export interface AverageCostPosition {
  quantity: number
  /** Cost of the quantity still held; null when an entry was unpriced. */
  costUsd: number | null
  /** Result fixed by what left; null once part of the history is missing. */
  realizedUsd: number | null
}

/** A remainder this small is rounding noise: the position counts as emptied. */
const DUST = 1e-9

/** Sum of the values, or null when any of them is unknown. */
export const sumOrNull = (values: readonly (number | null)[]) =>
  values.some((value) => value === null)
    ? null
    : values.reduce<number>((sum, value) => sum + value!, 0)

export function isRoundingDust(quantity: number): boolean {
  return quantity <= DUST
}

export function averageCost({ quantity, costUsd }: AverageCostPosition): number | null {
  return quantity > 0 && costUsd !== null ? costUsd / quantity : null
}

export function enterPosition(
  position: AverageCostPosition,
  quantity: number,
  costUsd: number | null
) {
  position.quantity += quantity
  position.costUsd =
    position.costUsd === null || costUsd === null ? null : position.costUsd + costUsd
}

/**
 * Take a quantity out at its average cost and return that cost. Taking more than the history
 * shows held means part of the history is missing: the token can no longer be valued. An emptied
 * position starts again from its next entry.
 */
export function exitAtAverageCost(position: AverageCostPosition, quantity: number): number | null {
  const isOverdrawn = quantity > position.quantity + DUST
  const average = averageCost(position)
  const costUsd = isOverdrawn || average === null ? null : average * quantity
  position.quantity -= quantity
  if (isOverdrawn) position.realizedUsd = null
  if (isRoundingDust(position.quantity)) {
    position.quantity = 0
    position.costUsd = 0
  } else position.costUsd = costUsd === null ? null : position.costUsd! - costUsd
  return costUsd
}

/** Fix the gain or loss of a movement out of the Safe into the token's P&L. */
export function realizeExit(
  position: AverageCostPosition,
  proceedsUsd: number | null,
  costUsd: number | null
) {
  const pnlUsd = proceedsUsd === null || costUsd === null ? null : proceedsUsd - costUsd
  position.realizedUsd = sumOrNull([position.realizedUsd, pnlUsd])
  return pnlUsd
}

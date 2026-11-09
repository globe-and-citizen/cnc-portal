/** Unknown quotes stay unknown; a zero quantity needs no quote to be worth zero. */
export function valueTokenAmount(amount: number, price: number | null | undefined): number | null {
  if (!Number.isFinite(amount)) return null
  if (amount === 0) return 0
  if (price == null || !Number.isFinite(price) || price < 0) return null
  const value = amount * price
  return Number.isFinite(value) ? value : null
}

/** A displayed total is available only when every contributing value is known. */
export function sumFiatValues(values: readonly (number | null | undefined)[]): number | null {
  let total = 0
  for (const value of values) {
    if (value == null || !Number.isFinite(value)) return null
    total += value
  }
  return Number.isFinite(total) ? total : null
}

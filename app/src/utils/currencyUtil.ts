export function formatCurrencyShort(number: number, currency = 'USD') {
  const abs = Math.abs(number)
  let short = ''
  let divisor = 1

  if (abs >= 1_000_000_000) {
    short = 'B'
    divisor = 1_000_000_000
  } else if (abs >= 1_000_000) {
    short = 'M'
    divisor = 1_000_000
  } else if (abs >= 1_000) {
    short = 'K'
    divisor = 1_000
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(number / divisor)

  return short ? formatted.replace(/[\d,.]+/, (match) => match + short) : formatted
}

export function formatCryptoAmount(amount: string | number) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 20
  }).format(num)
}

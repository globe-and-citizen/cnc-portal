export function formatUSD(amount: number): string {
  if (isNaN(amount) || amount === 0) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount % 1 === 0 ? 2 : 4,
    maximumFractionDigits: amount % 1 === 0 ? 2 : 4
  }).format(amount)
}

export function formatAmount(amount: string): string {
  const num = parseFloat(amount)
  if (isNaN(num)) return '0'
  const decimals = num % 1 === 0 ? 2 : 4
  return num.toFixed(decimals)
}

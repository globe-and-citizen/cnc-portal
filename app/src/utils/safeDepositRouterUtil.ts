import { formatUnits, parseUnits } from 'viem'

/**
 * Format multiplier from contract (bigint) to human-readable decimal string
 * @param multiplier - Multiplier value from contract (in 6 decimals)
 * @param decimals - Token decimals (default: 6 for SHER)
 * @returns Formatted multiplier as decimal string
 */
export function formatSafeDepositRouterMultiplier(
  multiplier: bigint | undefined,
  decimals = 6
): string {
  if (!multiplier) return '0'
  return formatUnits(multiplier, decimals)
}

/**
 * Parse multiplier from user input to contract format
 * @param value - User input string
 * @param decimals - Token decimals (default: 6 for SHER)
 * @returns Multiplier in contract format (bigint)
 */
export function parseSafeDepositRouterMultiplier(value: string, decimals = 6): bigint {
  try {
    return parseUnits(value, decimals)
  } catch {
    return 0n
  }
}

/**
 * Calculate SHER compensation based on deposit amount and multiplier
 * @param depositAmount - Amount to deposit (as string)
 * @param multiplier - Current multiplier (as number)
 * @param decimals - Decimal places for rounding (default: 6)
 * @returns Calculated SHER amount as formatted string
 */
export function calculateSherCompensation(
  depositAmount: string,
  multiplier: number,
  decimals = 6
): string {
  if (!depositAmount || depositAmount === '' || depositAmount === '0') {
    return '0'
  }

  const amountNum = parseFloat(depositAmount)

  if (isNaN(amountNum) || multiplier === 0) {
    return '0'
  }

  const sherValue = amountNum * multiplier

  return sherValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  })
}

/**
 * Calculate deposit amount from desired SHER amount
 * @param sherAmount - Desired SHER amount (as string)
 * @param multiplier - Current multiplier (as number)
 * @param decimals - Decimal places for rounding (default: 6)
 * @returns Required deposit amount as formatted string
 */
export function calculateDepositFromSher(
  sherAmount: string,
  multiplier: number,
  decimals = 6
): string {
  if (!sherAmount || sherAmount === '' || sherAmount === '0') {
    return '0'
  }

  const sherNum = parseFloat(sherAmount)

  if (isNaN(sherNum) || sherNum < 0 || multiplier === 0) {
    return '0'
  }

  const depositAmount = sherNum / multiplier

  return depositAmount.toFixed(decimals).replace(/\.?0+$/, '') // Remove trailing zeros
}

/**
 * Validate SHER compensation calculation inputs
 * @param amount - Deposit amount
 * @param multiplier - Multiplier value
 * @returns Validation result
 */
export function validateSherCompensationInputs(
  amount: string | number,
  multiplier: string | number
): { valid: boolean; error?: string } {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount
  const multiplierNum = typeof multiplier === 'string' ? parseFloat(multiplier) : multiplier

  if (isNaN(amountNum) || amountNum <= 0) {
    return { valid: false, error: 'Invalid deposit amount' }
  }

  if (isNaN(multiplierNum) || multiplierNum <= 0) {
    return { valid: false, error: 'Invalid multiplier' }
  }

  return { valid: true }
}

/**
 * Format SHER amount for display
 * @param amount - SHER amount (as string or number)
 * @param decimals - Decimal places (default: 6)
 * @returns Formatted SHER amount
 */
export function formatSherAmount(amount: string | number, decimals = 6): string {
  const numValue =
    typeof amount === 'string'
      ? parseFloat(amount.replace(/,/g, '')) // Remove commas before parsing
      : amount

  if (isNaN(numValue)) return '0'

  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  })
}

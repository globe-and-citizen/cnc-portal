import { type MintRecapData, type StakeMode } from '@/types/investor'

export const TOKEN_DECIMALS = 6
const EPSILON = 1e-9

// Solves issued token delta from a target final ownership percentage.
const computeIssuedDelta = (
  targetStakePercentage: number,
  supply: number,
  balance: number
): number => {
  if (!Number.isFinite(targetStakePercentage) || supply <= 0) return 0
  const targetStake = targetStakePercentage / 100
  const denominator = 1 - targetStake
  const safeDenominator =
    Math.abs(denominator) <= Number.EPSILON
      ? denominator < 0
        ? -Number.EPSILON
        : Number.EPSILON
      : denominator
  const delta = (targetStake * supply - balance) / safeDenominator
  return Number.isFinite(delta) ? delta : 0
}

// Converts a percentage input into the paired amount field value for the current mode.
export const computeAmountFromPercentageInput = (
  percentageValue: number,
  mode: StakeMode,
  currentStakePercentage: number,
  supply: number,
  balance: number
): number => {
  if (!Number.isFinite(percentageValue) || percentageValue <= 0) return 0

  const targetStakePercentage =
    mode === 'ending' ? percentageValue : currentStakePercentage + percentageValue

  const delta = computeIssuedDelta(targetStakePercentage, supply, balance)
  return mode === 'ending' ? balance + delta : delta
}

// Converts amount field value to a transaction-safe issued delta.
export const computeIssuedAmountFromAmountInput = (
  amountInput: number,
  mode: StakeMode,
  balance: number
): number => {
  if (!Number.isFinite(amountInput) || amountInput <= 0) return 0
  if (mode === 'add') return amountInput
  const issuedAmount = amountInput - balance
  if (!Number.isFinite(issuedAmount) || issuedAmount <= EPSILON) return 0
  return issuedAmount
}

// Computes final recipient stake percentage after applying an issued delta.
const getFinalStakeFromAmount = (amount: number, supply: number, balance: number): number => {
  if (supply <= 0) return 0
  if (amount === 0) {
    const currentStake = (balance / supply) * 100
    if (!Number.isFinite(currentStake)) return 0
    return currentStake
  }
  if (amount < 0) return 0
  const stake = ((balance + amount) / (supply + amount)) * 100
  if (!Number.isFinite(stake)) return 0
  return stake
}

// Converts an amount input into the paired percentage field value for the current mode.
export const computePercentageFromAmountInput = (
  amountInput: number,
  mode: StakeMode,
  currentStakePercentage: number,
  supply: number,
  balance: number
): number => {
  if (!Number.isFinite(amountInput)) return 0
  if (supply <= 0) return 0

  const issuedDelta = mode === 'ending' ? amountInput - balance : amountInput
  const newSupply = supply + issuedDelta
  const newBalance = balance + issuedDelta
  if (newSupply <= 0 || newBalance < 0) return 0

  const endingPercentage = (newBalance / newSupply) * 100
  if (!Number.isFinite(endingPercentage)) return 0

  return mode === 'ending' ? endingPercentage : endingPercentage - currentStakePercentage
}

// Formats a stake percentage from raw bigint values with truncation-based precision control.
export const formatStakePercentageFromSupply = (
  balance: bigint,
  totalSupply: bigint,
  decimals = 2,
  keepTrailingZeros = false
): string => {
  if (totalSupply <= 0n) return '0'

  const factor = 10n ** BigInt(decimals)
  const scaled = (balance * 100n * factor) / totalSupply
  const integerPart = scaled / factor
  const fractionalPart = scaled % factor

  if (fractionalPart === 0n) {
    if (!keepTrailingZeros) return integerPart.toString()
    return `${integerPart}.${'0'.repeat(decimals)}`
  }

  const fractionalStringRaw = fractionalPart.toString().padStart(decimals, '0')
  const fractionalString = keepTrailingZeros
    ? fractionalStringRaw
    : fractionalStringRaw.replace(/0+$/, '')
  return `${integerPart}.${fractionalString}`
}

// Produces structured recap metrics (no UI strings) from the current issuance context.
export const getMintRecap = (
  amount: number,
  symbol: string,
  supply: number,
  recipientBalance: number
): MintRecapData => {
  if (!symbol) {
    return {
      showRecap: false,
      symbol: '',
      issuedAmount: 0,
      recipientStakeBefore: 0,
      recipientStakeAfter: 0,
      recipientStakeIssued: 0,
      recipientBalanceBefore: 0,
      recipientBalanceAfter: 0,
      totalSupplyBefore: 0,
      totalSupplyAfter: 0
    }
  }

  const normalizedAmount = Number.isFinite(amount) && Math.abs(amount) > EPSILON ? amount : 0
  const recipientStakeBefore = getFinalStakeFromAmount(0, supply, recipientBalance)
  const recipientStakeAfter = getFinalStakeFromAmount(normalizedAmount, supply, recipientBalance)
  const totalSupplyBefore = Math.max(0, supply)

  return {
    showRecap: true,
    symbol,
    issuedAmount: normalizedAmount,
    recipientStakeBefore,
    recipientStakeAfter,
    recipientStakeIssued: recipientStakeAfter - recipientStakeBefore,
    recipientBalanceBefore: Math.max(0, recipientBalance),
    recipientBalanceAfter: Math.max(0, recipientBalance + normalizedAmount),
    totalSupplyBefore,
    totalSupplyAfter: Math.max(0, totalSupplyBefore + normalizedAmount)
  }
}

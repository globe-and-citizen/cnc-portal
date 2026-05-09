import { type StakeMode } from '@/types/investor'

const TOKEN_DECIMALS = 6
const PERCENTAGE_DISPLAY_DECIMALS = 2

export const roundToDecimals = (value: number, decimals: number): number => {
  return Math.round(value * 10 ** decimals) / 10 ** decimals
}

export const truncateToDecimals = (value: number, decimals: number): number => {
  return Math.trunc(value * 10 ** decimals) / 10 ** decimals
}

export const formatDisplayNumber = (value: number, maxFractionDigits = TOKEN_DECIMALS): string => {
  return value.toLocaleString('en-US', { maximumFractionDigits: maxFractionDigits })
}

export const computeAmountFromTargetStake = (
  targetStakePercentage: number,
  supply: number,
  balance: number
): string => {
  if (isNaN(targetStakePercentage) || targetStakePercentage <= 0 || targetStakePercentage >= 100) {
    return ''
  }
  if (supply <= 0) return ''

  const targetStake = targetStakePercentage / 100
  const amount = (targetStake * supply - balance) / (1 - targetStake)
  if (!isFinite(amount) || amount <= 0) return ''

  return String(roundToDecimals(amount, TOKEN_DECIMALS))
}

export const computeAmountFromPercentageInput = (
  percentageValue: number,
  mode: StakeMode,
  currentStakePercentage: number,
  supply: number,
  balance: number
): string => {
  if (isNaN(percentageValue) || percentageValue <= 0) return ''

  const targetStakePercentage =
    mode === 'ending' ? percentageValue : currentStakePercentage + percentageValue

  const issuedAmount = Number(computeAmountFromTargetStake(targetStakePercentage, supply, balance))
  if (isNaN(issuedAmount) || issuedAmount <= 0) return ''

  if (mode === 'add') {
    return String(roundToDecimals(issuedAmount, TOKEN_DECIMALS))
  }

  return String(roundToDecimals(balance + issuedAmount, TOKEN_DECIMALS))
}

export const computeIssuedAmountFromAmountInput = (
  amountInput: number,
  mode: StakeMode,
  balance: number
): number | null => {
  if (isNaN(amountInput) || amountInput <= 0) return null

  if (mode === 'add') return amountInput

  const issuedAmount = amountInput - balance
  if (!isFinite(issuedAmount) || issuedAmount <= 0) return null
  return issuedAmount
}

export const getFinalStakeFromAmount = (
  amount: number,
  supply: number,
  balance: number
): number | null => {
  if (supply <= 0 || amount <= 0) return null
  const stake = ((balance + amount) / (supply + amount)) * 100
  if (!isFinite(stake)) return null
  return stake
}

export const computePercentageFromAmountInput = (
  amountInput: number,
  mode: StakeMode,
  currentStakePercentage: number,
  supply: number,
  balance: number
): string => {
  const issuedAmount = computeIssuedAmountFromAmountInput(amountInput, mode, balance)
  if (issuedAmount === null) return ''

  if (isNaN(issuedAmount) || issuedAmount <= 0) return ''
  const finalStakePercentage = getFinalStakeFromAmount(issuedAmount, supply, balance)
  if (finalStakePercentage === null) return ''

  if (mode === 'ending') {
    return String(roundToDecimals(finalStakePercentage, PERCENTAGE_DISPLAY_DECIMALS))
  }

  const deltaPercentage = finalStakePercentage - currentStakePercentage
  if (deltaPercentage <= 0) return ''
  return String(roundToDecimals(deltaPercentage, PERCENTAGE_DISPLAY_DECIMALS))
}

export const formatStakePercentageFromSupply = (
  balance: bigint,
  totalSupply: bigint,
  decimals = PERCENTAGE_DISPLAY_DECIMALS,
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

export const getRecapTokenStakeLine = (
  finalBalance: number | null,
  currentBalance: number,
  symbol: string | undefined
): string | null => {
  if (finalBalance === null || finalBalance <= 0 || !symbol) return null

  return `Recipient ${symbol} stake → ${formatDisplayNumber(finalBalance)} (was ${formatDisplayNumber(currentBalance)} ${symbol})`
}

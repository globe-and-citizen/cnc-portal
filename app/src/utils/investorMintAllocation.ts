import { type StakeMode } from '@/types/investor'
import { formatAmountWithPrecision } from '@/utils/currencyUtil'

export const TOKEN_DECIMALS = 6
const PERCENTAGE_DISPLAY_DECIMALS = 2

export const computeAmountFromPercentageInput = (
  percentageValue: number,
  mode: StakeMode,
  currentStakePercentage: number,
  supply: number,
  balance: number
): string => {
  if (!isFinite(percentageValue) || percentageValue <= 0) return ''

  if (mode === 'ending') {
    const targetStake = percentageValue / 100
    if (supply <= 0 || targetStake >= 1) return ''

    const issuedAmount = (targetStake * supply - balance) / (1 - targetStake)
    if (!isFinite(issuedAmount)) return ''

    const targetAmount = balance + issuedAmount
    if (!isFinite(targetAmount) || targetAmount <= 0) return ''
    return formatAmountWithPrecision(targetAmount, 0, 2)
  }

  // Add mode: calculate issued amount from target stake percentage
  const targetStakePercentage = currentStakePercentage + percentageValue
  if (targetStakePercentage <= 0 || targetStakePercentage >= 100 || supply <= 0) return ''

  const targetStake = targetStakePercentage / 100
  const issuedAmount = (targetStake * supply - balance) / (1 - targetStake)
  if (!isFinite(issuedAmount) || issuedAmount <= 0) return ''

  return formatAmountWithPrecision(issuedAmount, 0, 2)
}

export const computeIssuedAmountFromAmountInput = (
  amountInput: number,
  mode: StakeMode,
  balance: number
): number | null => {
  if (!isFinite(amountInput) || amountInput <= 0) return null

  if (mode === 'add') return amountInput

  const issuedAmount = amountInput - balance
  if (!isFinite(issuedAmount)) return null
  // Don't validate if issuedAmount <= 0 - just return it for calculation purposes
  return issuedAmount
}

const getFinalStakeFromAmount = (
  amount: number,
  supply: number,
  balance: number
): number | null => {
  if (supply <= 0) return null
  // When amount is 0, return the current stake (no change)
  if (amount === 0) {
    const currentStake = (balance / supply) * 100
    if (!isFinite(currentStake)) return null
    return currentStake
  }
  if (amount < 0) return null
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
  if (!isFinite(amountInput) || amountInput <= 0) return ''

  if (mode === 'ending') {
    // In ending mode, amountInput is the target final recipient balance.
    // Final stake = targetBalance / (currentSupply + issuedAmount),
    // where issuedAmount = targetBalance - currentRecipientBalance.
    const denominator = supply + amountInput - balance
    if (denominator <= 0) return ''
    const targetPercentage = (amountInput / denominator) * 100
    if (!isFinite(targetPercentage)) return ''
    return formatAmountWithPrecision(targetPercentage, 0, PERCENTAGE_DISPLAY_DECIMALS)
  }

  // In add mode, calculate the issued amount and the resulting percentage
  const issuedAmount = amountInput
  const finalStakePercentage = getFinalStakeFromAmount(issuedAmount, supply, balance)
  if (finalStakePercentage === null) return ''

  const deltaPercentage = finalStakePercentage - currentStakePercentage
  return formatAmountWithPrecision(Math.max(0, deltaPercentage), 0, PERCENTAGE_DISPLAY_DECIMALS)
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

export const getMintRecap = (
  hasRecipientContext: boolean,
  amount: number | null,
  symbol: string | undefined,
  supply: number,
  recipientBalance: number,
  currentStakePercentage: number,
  placeholderMessage?: string
) => {
  // If no symbol, can't show anything useful
  if (!symbol) {
    return {
      recapIssuedLine: null,
      recapStakeLine: null,
      recapTokenStakeLine: null,
      recapSupplyLine: null,
      showRecap: false,
      isPlaceholder: false
    }
  }

  // Invalid amount: show placeholder to help user understand what would happen
  if (amount === null || isNaN(amount)) {
    return {
      recapIssuedLine: placeholderMessage || 'Enter or Update amount to see the impact',
      recapStakeLine: null,
      recapTokenStakeLine: null,
      recapSupplyLine:
        supply > 0
          ? `Current supply: ${formatAmountWithPrecision(supply, 0, TOKEN_DECIMALS)} ${symbol}`
          : 'No tokens issued yet',
      showRecap: true,
      isPlaceholder: true
    }
  }

  // Special case: initial supply (supply = 0)
  // Any amount issued = 100% stake, creating the first tokens
  if (supply === 0) {
    return {
      recapIssuedLine: null,
      recapStakeLine: `Recipient stake → 100% (initial supply)`,
      recapTokenStakeLine: `Recipient ${symbol} stake → ${formatAmountWithPrecision(amount, 0, TOKEN_DECIMALS)} ${symbol} (was 0 ${symbol}; issuing ${formatAmountWithPrecision(amount, 0, TOKEN_DECIMALS)} ${symbol})`,
      recapSupplyLine: `New total supply → ${formatAmountWithPrecision(amount, 0, TOKEN_DECIMALS)} ${symbol}`,
      showRecap: true
    }
  }

  // When we don't have recipient context yet (loading or invalid address)
  // Still show a basic recap with what we know
  if (!hasRecipientContext) {
    const estimatedStake = getFinalStakeFromAmount(amount, supply, 0)
    return {
      recapIssuedLine: null,
      recapStakeLine: estimatedStake
        ? `Recipient stake → ${formatAmountWithPrecision(estimatedStake, 0, PERCENTAGE_DISPLAY_DECIMALS)}% (estimated)`
        : null,
      recapTokenStakeLine: `Recipient ${symbol} stake → ${formatAmountWithPrecision(amount, 0, TOKEN_DECIMALS)} ${symbol}`,
      recapSupplyLine: `New total supply → ${formatAmountWithPrecision(supply + amount, 0, TOKEN_DECIMALS)} ${symbol}`,
      showRecap: true
    }
  }

  // Normal case: existing supply with recipient context
  const finalStake = getFinalStakeFromAmount(amount, supply, recipientBalance)
  const finalRecipientBalance = recipientBalance + amount
  const issuedStakePercentage =
    finalStake === null ? 0 : Math.max(0, finalStake - currentStakePercentage)

  return {
    recapIssuedLine: null,
    recapStakeLine:
      finalStake !== null
        ? `Recipient stake → ${formatAmountWithPrecision(finalStake, 0, PERCENTAGE_DISPLAY_DECIMALS)}% (was ${formatAmountWithPrecision(currentStakePercentage, 0, PERCENTAGE_DISPLAY_DECIMALS)}%; issuing ${formatAmountWithPrecision(issuedStakePercentage, 0, PERCENTAGE_DISPLAY_DECIMALS)}%)`
        : null,
    recapTokenStakeLine: `Recipient ${symbol} stake → ${formatAmountWithPrecision(finalRecipientBalance, 0, TOKEN_DECIMALS)} ${symbol} (was ${formatAmountWithPrecision(recipientBalance, 0, TOKEN_DECIMALS)} ${symbol}; issuing ${formatAmountWithPrecision(amount, 0, TOKEN_DECIMALS)} ${symbol})`,
    recapSupplyLine:
      supply > 0
        ? `New total supply → ${formatAmountWithPrecision(supply + amount, 0, TOKEN_DECIMALS)} ${symbol}`
        : null,
    showRecap: true
  }
}

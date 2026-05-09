import { computed, ref, watch, type Ref } from 'vue'
import { formatUnits } from 'viem'
import {
  computeAmountFromPercentageInput,
  computePercentageFromAmountInput,
  formatDisplayNumber,
  getFinalStakeFromAmount,
  roundToDecimals,
  truncateToDecimals
} from '@/utils/investorMintAllocation'
import { type MintStakeFormState, type StakeMode } from '@/types/investor'

const TOKEN_DECIMALS = 6
const PERCENTAGE_DISPLAY_DECIMALS = 2
type InputField = 'amount' | 'percentage'

export function useMintStakeAllocation(
  state: MintStakeFormState,
  totalSupplyRaw: Ref<bigint | null | undefined>,
  recipientBalanceRaw: Ref<bigint | null | undefined>,
  tokenSymbol: Ref<string | undefined>
) {
  const lastEditedField = ref<InputField>('percentage')

  const totalSupplyDisplay = computed(() => {
    if (totalSupplyRaw.value === undefined || totalSupplyRaw.value === null) return null
    return formatUnits(totalSupplyRaw.value, TOKEN_DECIMALS)
  })

  const totalSupplyNumber = computed(() => Number(totalSupplyDisplay.value ?? '0'))
  const recipientBalanceNumber = computed(() => {
    if (recipientBalanceRaw.value === undefined || recipientBalanceRaw.value === null) return 0
    return Number(formatUnits(recipientBalanceRaw.value, TOKEN_DECIMALS))
  })

  const currentStakePercentage = computed(() => {
    if (totalSupplyNumber.value <= 0) return 0
    return (recipientBalanceNumber.value / totalSupplyNumber.value) * 100
  })

  const syncAmountFromPercentage = () => {
    state.amount = computeAmountFromPercentageInput(
      Number(state.percentage),
      state.stakeMode,
      currentStakePercentage.value,
      totalSupplyNumber.value,
      recipientBalanceNumber.value
    )
  }

  const syncPercentageFromAmount = () => {
    state.percentage = computePercentageFromAmountInput(
      Number(state.amount),
      state.stakeMode,
      currentStakePercentage.value,
      totalSupplyNumber.value,
      recipientBalanceNumber.value
    )
  }

  const onPercentageChange = (value: string | number) => {
    lastEditedField.value = 'percentage'
    state.amount = computeAmountFromPercentageInput(
      Number(value),
      state.stakeMode,
      currentStakePercentage.value,
      totalSupplyNumber.value,
      recipientBalanceNumber.value
    )
  }

  const onAmountChange = (value: string | number) => {
    lastEditedField.value = 'amount'
    state.percentage = computePercentageFromAmountInput(
      Number(value),
      state.stakeMode,
      currentStakePercentage.value,
      totalSupplyNumber.value,
      recipientBalanceNumber.value
    )
  }

  const setStakeMode = (mode: StakeMode) => {
    if (state.stakeMode === mode) return
    state.stakeMode = mode

    if (lastEditedField.value === 'amount' && state.amount) {
      syncPercentageFromAmount()
      return
    }

    if (state.percentage) {
      syncAmountFromPercentage()
    }
  }

  watch([() => state.address, () => state.stakeMode, totalSupplyRaw, recipientBalanceRaw], () => {
    if (lastEditedField.value === 'amount' && state.amount) {
      syncPercentageFromAmount()
      return
    }
    if (state.percentage) {
      syncAmountFromPercentage()
    }
  })

  const allocationRecap = computed(() => {
    const amount = Number(state.amount)
    const finalStake = getFinalStakeFromAmount(
      amount,
      totalSupplyNumber.value,
      recipientBalanceNumber.value
    )
    const symbol = tokenSymbol.value
    if (isNaN(amount) || amount <= 0 || finalStake === null || !symbol) return null

    const currentStake = truncateToDecimals(
      currentStakePercentage.value,
      PERCENTAGE_DISPLAY_DECIMALS
    )
    const formattedFinalStake = roundToDecimals(finalStake, PERCENTAGE_DISPLAY_DECIMALS)

    return `Issuing ${formatDisplayNumber(amount)} ${symbol} → recipient stake ${formattedFinalStake}% (was ${currentStake}%)`
  })

  const newTotalSupplyRecap = computed(() => {
    const amount = Number(state.amount)
    const symbol = tokenSymbol.value
    if (isNaN(amount) || amount <= 0 || totalSupplyNumber.value <= 0 || !symbol) return null
    return `New total supply: ${formatDisplayNumber(totalSupplyNumber.value + amount)} ${symbol}`
  })

  const endingStakeValidationMessage = computed(() => {
    if (state.stakeMode !== 'ending') return null
    if (totalSupplyNumber.value <= 0) return null

    const endingPercentage = Number(state.percentage)
    if (isNaN(endingPercentage) || endingPercentage <= 0) return null

    const currentStake = truncateToDecimals(
      currentStakePercentage.value,
      PERCENTAGE_DISPLAY_DECIMALS
    )
    if (endingPercentage > currentStake) return null

    return `Ending % must be greater than recipient's current stake (${currentStake}%).`
  })

  return {
    allocationRecap,
    endingStakeValidationMessage,
    newTotalSupplyRecap,
    onAmountChange,
    onPercentageChange,
    setStakeMode,
    totalSupplyDisplay
  }
}

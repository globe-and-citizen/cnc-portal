import { computed, ref, watch, type Ref } from 'vue'
import { formatUnits } from 'viem'
import {
  computeAmountFromPercentageInput,
  computeIssuedAmountFromAmountInput,
  computePercentageFromAmountInput,
  formatDisplayNumber,
  getFinalStakeFromAmount,
  getRecapTokenStakeLine,
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
  tokenSymbol: Ref<string | undefined>,
  isRecipientAddressValid: Ref<boolean>
) {
  const lastEditedField = ref<InputField>('percentage')

  const totalSupplyDisplay = computed(() => {
    if (totalSupplyRaw.value === undefined || totalSupplyRaw.value === null) return null
    return formatUnits(totalSupplyRaw.value, TOKEN_DECIMALS)
  })

  const totalSupplyNumber = computed(() => Number(totalSupplyDisplay.value ?? '0'))
  const hasRecipientBalance = computed(
    () => recipientBalanceRaw.value !== undefined && recipientBalanceRaw.value !== null
  )
  const hasRecipientContext = computed(
    () => isRecipientAddressValid.value && hasRecipientBalance.value
  )

  const recipientBalanceNumber = computed(() => {
    if (!hasRecipientContext.value) return 0
    const recipientBalance = recipientBalanceRaw.value
    if (recipientBalance === undefined || recipientBalance === null) return 0
    return Number(formatUnits(recipientBalance, TOKEN_DECIMALS))
  })

  const currentStakePercentage = computed(() => {
    if (totalSupplyNumber.value <= 0) return 0
    return (recipientBalanceNumber.value / totalSupplyNumber.value) * 100
  })

  const issuedAmount = computed(() =>
    computeIssuedAmountFromAmountInput(
      Number(state.amount),
      state.stakeMode,
      recipientBalanceNumber.value
    )
  )

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
    if (!hasRecipientContext.value) {
      state.amount = ''
      return
    }
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
    if (!hasRecipientContext.value) {
      state.percentage = ''
      return
    }
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
    if (!hasRecipientContext.value) {
      if (lastEditedField.value === 'amount') {
        state.percentage = ''
      } else if (lastEditedField.value === 'percentage') {
        state.amount = ''
      }
      return
    }

    if (lastEditedField.value === 'amount' && state.amount) {
      syncPercentageFromAmount()
      return
    }
    if (state.percentage) {
      syncAmountFromPercentage()
    }
  })

  const recapIssuedLine = computed(() => {
    if (!hasRecipientContext.value) return null
    const amount = issuedAmount.value
    const symbol = tokenSymbol.value
    if (amount === null || isNaN(amount) || amount <= 0 || !symbol) return null

    return `Issuing ${formatDisplayNumber(amount)} ${symbol}`
  })

  const recapStakeLine = computed(() => {
    if (!hasRecipientContext.value) return null
    const amount = issuedAmount.value
    const finalStake = getFinalStakeFromAmount(
      amount ?? 0,
      totalSupplyNumber.value,
      recipientBalanceNumber.value
    )
    if (amount === null || isNaN(amount) || amount <= 0 || finalStake === null) return null

    const currentStake = truncateToDecimals(
      currentStakePercentage.value,
      PERCENTAGE_DISPLAY_DECIMALS
    )
    const formattedFinalStake = roundToDecimals(finalStake, PERCENTAGE_DISPLAY_DECIMALS)
    return `Recipient stake → ${formattedFinalStake}% (was ${currentStake}%)`
  })

  const recapSupplyLine = computed(() => {
    if (!hasRecipientContext.value) return null
    const amount = issuedAmount.value
    const symbol = tokenSymbol.value
    if (amount === null || isNaN(amount) || amount <= 0 || totalSupplyNumber.value <= 0 || !symbol)
      return null
    return `New total supply → ${formatDisplayNumber(totalSupplyNumber.value + amount)} ${symbol}`
  })

  const finalRecipientBalance = computed(() => {
    const amount = issuedAmount.value
    if (amount === null || isNaN(amount) || amount <= 0) return null
    return recipientBalanceNumber.value + amount
  })

  const recapTokenStakeLine = computed(() =>
    hasRecipientContext.value
      ? getRecapTokenStakeLine(
          finalRecipientBalance.value,
          recipientBalanceNumber.value,
          tokenSymbol.value
        )
      : null
  )
  const showRecap = computed(() =>
    Boolean(
      recapIssuedLine.value ||
      recapStakeLine.value ||
      recapTokenStakeLine.value ||
      recapSupplyLine.value
    )
  )

  const isEndingStakeInvalid = computed(() => {
    if (state.stakeMode !== 'ending') return false
    if (!hasRecipientContext.value) return false
    if (totalSupplyNumber.value <= 0) return false

    const endingAmountValue = Number(state.amount)
    if (
      !isNaN(endingAmountValue) &&
      endingAmountValue > 0 &&
      endingAmountValue <= recipientBalanceNumber.value
    ) {
      return true
    }

    const endingPercentage = Number(state.percentage)
    if (isNaN(endingPercentage) || endingPercentage <= 0) return false

    const currentStake = truncateToDecimals(
      currentStakePercentage.value,
      PERCENTAGE_DISPLAY_DECIMALS
    )
    return endingPercentage <= currentStake
  })

  const endingStakeValidationMessage = computed(() => {
    if (!isEndingStakeInvalid.value) return null
    const currentStake = truncateToDecimals(
      currentStakePercentage.value,
      PERCENTAGE_DISPLAY_DECIMALS
    )
    return `Ending % must be greater than recipient's current stake (${currentStake}%).`
  })

  return {
    isEndingStakeInvalid,
    endingStakeValidationMessage,
    onAmountChange,
    onPercentageChange,
    recapIssuedLine,
    recapStakeLine,
    recapTokenStakeLine,
    recapSupplyLine,
    setStakeMode,
    showRecap,
    totalSupplyDisplay,
    issuedAmount
  }
}

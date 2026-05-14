<template>
  <div class="flex flex-col gap-6">
    <div class="space-y-3">
      <p class="text-sm font-semibold text-gray-900">Stake mode</p>
      <div class="grid grid-cols-2 rounded-xl border border-gray-200 bg-gray-100 p-1">
        <UButton
          size="sm"
          :color="state.stakeMode === 'add' ? 'primary' : 'neutral'"
          :variant="state.stakeMode === 'add' ? 'solid' : 'ghost'"
          class="justify-center rounded-lg font-semibold"
          data-test="add-mode-button"
          @click="setStakeMode('add')"
          label="Add %"
        />
        <UButton
          size="sm"
          :color="state.stakeMode === 'ending' ? 'primary' : 'neutral'"
          :variant="state.stakeMode === 'ending' ? 'solid' : 'ghost'"
          class="justify-center rounded-lg font-semibold"
          data-test="ending-mode-button"
          :disabled="isEndingModeDisabled"
          @click="setStakeMode('ending')"
          :label="state.stakeMode === 'ending' ? 'Ending % ✓' : 'Ending %'"
        />
      </div>
    </div>
    <UFormField name="amount" label="Ownership stake" :error="stakeValidationMessage ?? false">
      <p class="mb-2 text-xs text-gray-500" data-test="stake-range-hint">{{ stakeRangeHint }}</p>
      <TwinAmountInputs
        :percentage="state.percentage"
        :amount="state.amount"
        :inputColor="stakeInputColor"
        @update:percentage="onPercentageChange"
        @update:amount="onAmountChange"
      />
      <MintRecapCard
        :recipientAddress="recipientAddress"
        :issuedAmount="issuedAmount"
        :hasValidationError="!!stakeValidationMessage"
        :validationMessage="stakeValidationMessage ?? undefined"
      />
      <template #error="{ error }">
        <span v-if="error" data-test="ending-stake-validation-message">{{ error }}</span>
      </template>
    </UFormField>
  </div>
</template>
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { z } from 'zod'
import { formatUnits, isAddress } from 'viem'
import { useInvestorTotalSupply, useInvestorBalanceOf } from '@/composables/investor/reads'
import {
  computeAmountFromPercentageInput,
  computeIssuedAmountFromAmountInput,
  computePercentageFromAmountInput,
  TOKEN_DECIMALS
} from '@/utils/investorMintAllocation'
import { formatAmountWithPrecision } from '@/utils/currencyUtil'
import { type StakeMode } from '@/types/investor'
import TwinAmountInputs from './TwinAmountInputs.vue'
import MintRecapCard from './MintRecapCard.vue'
const props = defineProps<{ recipientAddress: string }>()
const emit = defineEmits<{
  'update:issuedAmount': [value: number | null]
  'update:isStakeInvalid': [value: boolean]
}>()
const state = reactive({ amount: '', percentage: '', stakeMode: 'ending' as StakeMode })
const { data: totalSupplyRaw } = useInvestorTotalSupply()
const { data: recipientBalanceRaw } = useInvestorBalanceOf(computed(() => props.recipientAddress))
const totalSupplyNumber = computed(() =>
  typeof totalSupplyRaw.value === 'bigint'
    ? Number(formatUnits(totalSupplyRaw.value, TOKEN_DECIMALS))
    : 0
)
const isEndingModeDisabled = computed(
  () => typeof totalSupplyRaw.value === 'bigint' && totalSupplyRaw.value === 0n
)
const hasRecipientContext = computed(
  () => isAddress(props.recipientAddress) && typeof recipientBalanceRaw.value === 'bigint'
)
const recipientBalanceNumber = computed(() =>
  hasRecipientContext.value && typeof recipientBalanceRaw.value === 'bigint'
    ? Number(formatUnits(recipientBalanceRaw.value, TOKEN_DECIMALS))
    : 0
)
const currentStakePercentage = computed(() =>
  totalSupplyNumber.value > 0 ? (recipientBalanceNumber.value / totalSupplyNumber.value) * 100 : 0
)
const stakeConstraints = computed(() => {
  const current = Math.trunc(currentStakePercentage.value * 100) / 100
  return {
    addMax: Math.max(0, 100 - current),
    endingMin: hasRecipientContext.value ? current : 0,
    endingMax: 100,
    current
  }
})
const stakeRangeHint = computed(() => {
  if (state.stakeMode === 'add') {
    if (totalSupplyNumber.value <= 0) return 'Add mode: enter shr amount to create initial supply.'
    return `Allowed Add % range: > 0% and < ${formatAmountWithPrecision(stakeConstraints.value.addMax, 0, 2)}% (current stake ${formatAmountWithPrecision(stakeConstraints.value.current, 0, 2)}%).`
  }
  if (totalSupplyNumber.value <= 0) return 'Allowed Ending % range: unavailable while supply is 0.'
  return `Allowed Ending % range: > ${formatAmountWithPrecision(stakeConstraints.value.endingMin, 0, 2)}% and < 100% (current stake ${formatAmountWithPrecision(stakeConstraints.value.current, 0, 2)}%).`
})

const schema = z.object({
  amount: z.string().refine(
    (v) => {
      if (v.trim() === '') return true
      const num = Number(String(v).replace(/,/g, '').trim())
      return Number.isFinite(num) && num > 0
    },
    { message: 'Amount must be greater than 0' }
  ),
  percentage: z.string(),
  stakeMode: z.enum(['add', 'ending'])
})
const issuedAmount = computed(() => {
  const amount = Number(String(state.amount).replace(/,/g, '').trim())
  return computeIssuedAmountFromAmountInput(amount, state.stakeMode, recipientBalanceNumber.value)
})
const lastEditedField = ref<'amount' | 'percentage'>('percentage')
const stakeValidationMessage = computed(() => {
  if (!state.amount && !state.percentage) return null
  const amountResult = schema.safeParse(state)
  if (!amountResult.success) {
    const amountIssue = amountResult.error.issues.find((issue) => issue.path[0] === 'amount')
    if (amountIssue) return amountIssue.message
  }

  const percentage = Number(String(state.percentage).replace(/,/g, '').trim())
  if (!Number.isFinite(percentage) || percentage <= 0) return null

  if (state.stakeMode === 'add') {
    if (totalSupplyNumber.value <= 0) return null
    if (percentage >= stakeConstraints.value.addMax) {
      return 'Add % is outside the allowed range shown above.'
    }
    return null
  }

  if (totalSupplyNumber.value <= 0) {
    return 'Ending % is unavailable while supply is 0. Switch to Add mode.'
  }
  if (percentage <= stakeConstraints.value.endingMin) {
    return `Ending % must be greater than ${formatAmountWithPrecision(stakeConstraints.value.endingMin, 0, 2)}%.`
  }
  if (percentage >= stakeConstraints.value.endingMax) {
    return 'Ending % must stay below 100%.'
  }
  return null
})
const stakeInputColor = computed<'primary' | 'neutral'>(() =>
  state.stakeMode === 'add' ? 'primary' : 'neutral'
)
const onPercentageChange = (value: string | number) => {
  lastEditedField.value = 'percentage'
  state.percentage = String(value)
  if (totalSupplyNumber.value === 0) {
    state.amount = ''
    return
  }
  const percentage = Number(String(value).replace(/,/g, '').trim())
  state.amount = computeAmountFromPercentageInput(
    percentage,
    state.stakeMode,
    currentStakePercentage.value,
    totalSupplyNumber.value,
    recipientBalanceNumber.value
  )
}
const onAmountChange = (value: string | number) => {
  lastEditedField.value = 'amount'
  state.amount = String(value)
  if (totalSupplyNumber.value === 0) {
    state.percentage = '100'
    return
  }
  const amount = Number(String(value).replace(/,/g, '').trim())
  state.percentage = computePercentageFromAmountInput(
    amount,
    state.stakeMode,
    currentStakePercentage.value,
    totalSupplyNumber.value,
    recipientBalanceNumber.value
  )
}
const setStakeMode = (mode: StakeMode) => {
  if (mode === 'ending' && isEndingModeDisabled.value) return
  if (state.stakeMode === mode) return
  state.stakeMode = mode
  if (lastEditedField.value === 'amount' && state.amount) {
    const amount = Number(String(state.amount).replace(/,/g, '').trim())
    state.percentage = computePercentageFromAmountInput(
      amount,
      state.stakeMode,
      currentStakePercentage.value,
      totalSupplyNumber.value,
      recipientBalanceNumber.value
    )
    return
  }
  if (state.percentage) {
    const percentage = Number(String(state.percentage).replace(/,/g, '').trim())
    state.amount = computeAmountFromPercentageInput(
      percentage,
      state.stakeMode,
      currentStakePercentage.value,
      totalSupplyNumber.value,
      recipientBalanceNumber.value
    )
  }
}
watch(
  () => isEndingModeDisabled.value,
  (disabled) => {
    if (disabled && state.stakeMode === 'ending') {
      setStakeMode('add')
    }
  },
  { immediate: true }
)
watch(
  [
    () => props.recipientAddress,
    () => state.stakeMode,
    () => hasRecipientContext.value,
    () => totalSupplyNumber.value,
    () => recipientBalanceNumber.value
  ],
  () => {
    if (totalSupplyNumber.value === 0) {
      if (state.amount) state.percentage = '100'
      return
    }
    if (
      state.stakeMode === 'ending' &&
      recipientBalanceNumber.value > 0 &&
      (!state.amount || Number(String(state.amount).replace(/,/g, '').trim()) === 0)
    ) {
      state.amount = formatAmountWithPrecision(recipientBalanceNumber.value, 0, TOKEN_DECIMALS)
      state.percentage = formatAmountWithPrecision(currentStakePercentage.value, 0, 2)
      return
    }
    if (lastEditedField.value === 'amount' && state.amount) {
      const amount = Number(String(state.amount).replace(/,/g, '').trim())
      state.percentage = computePercentageFromAmountInput(
        amount,
        state.stakeMode,
        currentStakePercentage.value,
        totalSupplyNumber.value,
        recipientBalanceNumber.value
      )
      return
    }
    if (state.percentage) {
      const percentage = Number(String(state.percentage).replace(/,/g, '').trim())
      state.amount = computeAmountFromPercentageInput(
        percentage,
        state.stakeMode,
        currentStakePercentage.value,
        totalSupplyNumber.value,
        recipientBalanceNumber.value
      )
    }
  }
)
watch(
  [issuedAmount, stakeValidationMessage],
  () => {
    emit('update:issuedAmount', issuedAmount.value)
    emit(
      'update:isStakeInvalid',
      !!stakeValidationMessage.value || issuedAmount.value === null || issuedAmount.value <= 0
    )
  },
  { immediate: true }
)
</script>

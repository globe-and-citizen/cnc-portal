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
          :disabled="totalSupplyNumber === 0"
          @click="setStakeMode('ending')"
          label="Ending %"
        />
      </div>
    </div>
    <UFormField name="stake.amount" label="Ownership stake">
      <TwinAmountInputs
        :percentage="state.percentage"
        :amount="state.amount"
        :inputColor="state.stakeMode === 'add' ? 'primary' : 'neutral'"
        :minPercentage="state.stakeMode === 'add' ? 0 : stakeConstraints.endingMin"
        :maxPercentage="state.stakeMode === 'add' ? stakeConstraints.addMax : 100"
        @update:percentage="onPercentageChange"
        @update:amount="onAmountChange"
      />
      <template #error="{ error }">
        <span v-if="error" data-test="ending-stake-validation-message">{{ error }}</span>
      </template>
    </UFormField>
    <MintRecapCard
      :recipientAddress="recipientAddress"
      :issuedAmount="recapIssuedAmount"
      :requestedStakePercentage="
        state.stakeMode === 'ending' ? state.percentage : currentStakePercentage + state.percentage
      "
      :hasValidationError="!!props.hasValidationError"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { formatUnits } from 'viem'
import { useInvestorTotalSupply, useInvestorBalanceOf } from '@/composables/investor/reads'
import {
  computeAmountFromPercentageInput,
  computeIssuedAmountFromAmountInput,
  computePercentageFromAmountInput,
  TOKEN_DECIMALS
} from '@/utils/investorMintAllocation'
import { type StakeMode, type StakePayload } from '@/types/investor'
import TwinAmountInputs from './TwinAmountInputs.vue'
import MintRecapCard from './MintRecapCard.vue'
import { type Address } from 'viem'

const props = defineProps<{
  recipientAddress: Address
  /** Whether the parent form's schema currently rejects the stake — drives the recap's error state. */
  hasValidationError?: boolean
}>()

const emit = defineEmits<{
  'update:issuedAmount': [value: number]
  'update:stakePayload': [value: StakePayload]
}>()

// State stores RAW numeric values (or 0 for invalid/empty)
const state = reactive({
  amount: 0,
  percentage: 0,
  stakeMode: 'ending' as StakeMode
})

// Track which field the user last edited
const lastEditedField = ref<'amount' | 'percentage'>('percentage')

const { data: totalSupplyRaw } = useInvestorTotalSupply()
const { data: recipientBalanceRaw } = useInvestorBalanceOf(computed(() => props.recipientAddress))

const totalSupplyNumber = computed(() =>
  Number(formatUnits((totalSupplyRaw.value as bigint | undefined) ?? 0n, TOKEN_DECIMALS))
)

const recipientBalanceNumber = computed(() =>
  Number(formatUnits((recipientBalanceRaw.value as bigint | undefined) ?? 0n, TOKEN_DECIMALS))
)

const currentStakePercentage = computed(() =>
  totalSupplyNumber.value > 0 ? (recipientBalanceNumber.value / totalSupplyNumber.value) * 100 : 0
)

const stakeConstraints = computed(() => ({
  addMax: Math.max(0, 100 - currentStakePercentage.value),
  endingMin: recipientBalanceRaw.value !== undefined ? currentStakePercentage.value : 0
}))

// Transaction-safe delta used for submit flow (negative or tiny values collapse to 0)
const issuedAmount = computed(() => {
  if (state.amount === 0) return 0
  return computeIssuedAmountFromAmountInput(
    state.amount,
    state.stakeMode,
    recipientBalanceNumber.value
  )
})

// Recap delta follows the field the user last edited, while submit uses issuedAmount.
const recapIssuedAmount = computed(() => {
  if (lastEditedField.value === 'percentage') {
    const amount = computeAmountFromPercentageInput(
      state.percentage,
      state.stakeMode,
      currentStakePercentage.value,
      totalSupplyNumber.value,
      recipientBalanceNumber.value
    )
    return state.stakeMode === 'ending' ? amount - recipientBalanceNumber.value : amount
  }
  if (!Number.isFinite(state.amount) || state.amount === 0) return 0
  if (state.stakeMode === 'add') return state.amount
  return state.amount - recipientBalanceNumber.value
})

// Syncs the field the user didn't edit from the one they did
const syncOtherField = () => {
  if (totalSupplyNumber.value === 0) {
    if (lastEditedField.value === 'percentage') state.amount = 0
    else state.percentage = 100
    return
  }
  if (lastEditedField.value === 'amount') {
    state.percentage = computePercentageFromAmountInput(
      state.amount,
      state.stakeMode,
      currentStakePercentage.value,
      totalSupplyNumber.value,
      recipientBalanceNumber.value
    )
  } else {
    state.amount = computeAmountFromPercentageInput(
      state.percentage,
      state.stakeMode,
      currentStakePercentage.value,
      totalSupplyNumber.value,
      recipientBalanceNumber.value
    )
  }
}

const onPercentageChange = (value: number) => {
  if (value === state.percentage) return
  lastEditedField.value = 'percentage'
  state.percentage = value
  syncOtherField()
}

const onAmountChange = (value: number) => {
  if (value === state.amount) return
  lastEditedField.value = 'amount'
  state.amount = value
  syncOtherField()
}

const setStakeMode = (mode: StakeMode) => {
  if (mode === 'ending' && totalSupplyNumber.value === 0) return
  if (state.stakeMode === mode) return
  state.stakeMode = mode
  syncOtherField()
}

if (totalSupplyNumber.value === 0 && state.stakeMode === 'ending') {
  setStakeMode('add')
}

watch(
  [
    () => props.recipientAddress,
    () => recipientBalanceRaw.value,
    () => totalSupplyNumber.value,
    () => recipientBalanceNumber.value
  ],
  () => {
    if (totalSupplyNumber.value === 0 && state.stakeMode === 'ending') {
      setStakeMode('add')
      return
    }
    // Pre-fill ending mode when recipient balance first loads
    if (state.stakeMode === 'ending' && recipientBalanceNumber.value > 0 && state.amount === 0) {
      state.amount = recipientBalanceNumber.value
      state.percentage = currentStakePercentage.value
      return
    }
    syncOtherField()
  }
)

watch(
  () => ({
    issuedAmount: issuedAmount.value,
    payload: {
      amount: state.amount,
      percentage: state.percentage,
      stakeMode: state.stakeMode,
      addMax: stakeConstraints.value.addMax,
      endingMin: stakeConstraints.value.endingMin,
      totalSupply: totalSupplyNumber.value
    }
  }),
  ({ issuedAmount, payload }) => {
    emit('update:issuedAmount', issuedAmount)
    emit('update:stakePayload', payload)
  },
  { immediate: true }
)
</script>

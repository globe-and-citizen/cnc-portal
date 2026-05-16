<template>
  <div
    v-if="recap.showRecap"
    :class="[
      'rounded-xl border p-4',
      hasValidationError ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'
    ]"
    data-test="recap-card"
  >
    <div
      :class="[
        'mb-2 flex items-center gap-2 text-sm font-semibold',
        hasValidationError ? 'text-red-700' : 'text-blue-700'
      ]"
    >
      <UIcon name="i-lucide-info" class="size-4" />
      <span>Recap</span>
    </div>
    <div :class="['space-y-1.5 text-sm', hasValidationError ? 'text-red-900' : 'text-blue-900']">
      <p data-test="recap-stake-line">{{ recapStakeLine }}</p>
      <p data-test="recap-token-stake-line">{{ recapTokenStakeLine }}</p>
      <p data-test="new-total-supply-recap">{{ recapSupplyLine }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatUnits } from 'viem'
import {
  useInvestorSymbol,
  useInvestorTotalSupply,
  useInvestorBalanceOf
} from '@/composables/investor/reads'
import { getMintRecap, TOKEN_DECIMALS } from '@/utils/investorMintAllocation'
import { formatAmountWithPrecision } from '@/utils/currencyUtil'

const props = defineProps<{
  recipientAddress: string
  issuedAmount: number | null
  requestedStakePercentage?: number
  hasValidationError?: boolean
}>()

const { data: tokenSymbol } = useInvestorSymbol()
const { data: totalSupplyRaw } = useInvestorTotalSupply()
const { data: recipientBalanceRaw } = useInvestorBalanceOf(computed(() => props.recipientAddress))

const totalSupplyNumber = computed(() => {
  if (typeof totalSupplyRaw.value !== 'bigint') return 0
  return Number(formatUnits(totalSupplyRaw.value, TOKEN_DECIMALS))
})

const recipientBalanceNumber = computed(() => {
  if (typeof recipientBalanceRaw.value !== 'bigint') return 0
  return Number(formatUnits(recipientBalanceRaw.value, TOKEN_DECIMALS))
})

const recap = computed(() =>
  getMintRecap(
    props.issuedAmount ?? 0,
    tokenSymbol.value as string,
    totalSupplyNumber.value,
    recipientBalanceNumber.value
  )
)

const recapStakeAfterDisplay = computed(() => {
  if (
    typeof props.requestedStakePercentage === 'number' &&
    Number.isFinite(props.requestedStakePercentage) &&
    props.requestedStakePercentage > 0
  ) {
    return props.requestedStakePercentage
  }
  return recap.value.recipientStakeAfter
})

const recapStakeLine = computed(
  () =>
    `Recipient stake → ${formatAmountWithPrecision(recapStakeAfterDisplay.value, 0, 2)}% (was ${formatAmountWithPrecision(recap.value.recipientStakeBefore, 0, 2)}%; issuing ${formatAmountWithPrecision(recapStakeAfterDisplay.value - recap.value.recipientStakeBefore, 0, 2)}%)`
)

const recapTokenStakeLine = computed(
  () =>
    `Recipient ${recap.value.symbol} stake → ${formatAmountWithPrecision(recap.value.recipientBalanceAfter, 0, TOKEN_DECIMALS)} ${recap.value.symbol} (was ${formatAmountWithPrecision(recap.value.recipientBalanceBefore, 0, TOKEN_DECIMALS)} ${recap.value.symbol}; issuing ${formatAmountWithPrecision(recap.value.issuedAmount, 0, TOKEN_DECIMALS)} ${recap.value.symbol})`
)

const recapSupplyLine = computed(
  () =>
    `New total supply → ${formatAmountWithPrecision(recap.value.totalSupplyAfter, 0, TOKEN_DECIMALS)} ${recap.value.symbol} (current supply ${formatAmountWithPrecision(recap.value.totalSupplyBefore, 0, TOKEN_DECIMALS)} ${recap.value.symbol})`
)
</script>

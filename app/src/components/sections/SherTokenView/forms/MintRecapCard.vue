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
import { formatUnits, parseUnits } from 'viem'
import {
  useInvestorSymbol,
  useInvestorTotalSupply,
  useInvestorBalanceOf
} from '@/composables/investor/reads'
import {
  getMintRecap,
  formatStakePercentageFromSupply,
  TOKEN_DECIMALS
} from '@/utils/investorMintAllocation'
import { formatAmountWithPrecision } from '@/utils/currencyUtil'

const props = defineProps<{
  recipientAddress: string
  issuedAmount: number | null
  /** Target stake the user asked for — shown only when the issuance is mathematically unsolvable. */
  requestedStakePercentage?: number
  hasValidationError?: boolean
}>()

const { data: tokenSymbol } = useInvestorSymbol()
const { data: totalSupplyRaw } = useInvestorTotalSupply()
const { data: recipientBalanceRaw } = useInvestorBalanceOf(computed(() => props.recipientAddress))

const supplyBeforeRaw = computed<bigint>(() =>
  typeof totalSupplyRaw.value === 'bigint' ? totalSupplyRaw.value : 0n
)
const balanceBeforeRaw = computed<bigint>(() =>
  typeof recipientBalanceRaw.value === 'bigint' ? recipientBalanceRaw.value : 0n
)

// Issued delta in base units. parseUnits keeps full token precision and supports the
// negative deltas produced by an under-target ending amount.
const issuedRaw = computed<bigint>(() => {
  const issued = props.issuedAmount
  if (issued == null || !Number.isFinite(issued) || issued === 0) return 0n
  return parseUnits(issued.toFixed(TOKEN_DECIMALS), TOKEN_DECIMALS)
})

const recap = computed(() =>
  getMintRecap(
    props.issuedAmount ?? 0,
    tokenSymbol.value as string,
    Number(formatUnits(supplyBeforeRaw.value, TOKEN_DECIMALS)),
    Number(formatUnits(balanceBeforeRaw.value, TOKEN_DECIMALS))
  )
)

// Stake percentages use the same bigint-truncation formatter as ShareholderList, so the
// recap never promises a stake the holders table will then contradict.
const stakeBefore = computed(() =>
  formatStakePercentageFromSupply(balanceBeforeRaw.value, supplyBeforeRaw.value, 2, true)
)

const stakeAfter = computed(() => {
  const supplyAfter = supplyBeforeRaw.value + issuedRaw.value
  const balanceAfter = balanceBeforeRaw.value + issuedRaw.value
  if (supplyAfter > 0n && balanceAfter >= 0n) {
    return formatStakePercentageFromSupply(balanceAfter, supplyAfter, 2, true)
  }
  // Unsolvable target (e.g. requested ending stake ≥ 100%): echo what the user asked for.
  if (
    typeof props.requestedStakePercentage === 'number' &&
    Number.isFinite(props.requestedStakePercentage)
  ) {
    return formatAmountWithPrecision(props.requestedStakePercentage, 2, 2)
  }
  return stakeBefore.value
})

const stakeIssued = computed(() =>
  formatAmountWithPrecision(Number(stakeAfter.value) - Number(stakeBefore.value), 2, 2)
)

const recapStakeLine = computed(
  () =>
    `Recipient stake → ${stakeAfter.value}% (was ${stakeBefore.value}%; issuing ${stakeIssued.value}%)`
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

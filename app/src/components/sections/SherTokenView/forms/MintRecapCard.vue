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
      <p v-if="recap.recapIssuedLine" data-test="allocation-recap">
        {{ recap.recapIssuedLine }}
      </p>
      <p v-if="recap.recapStakeLine" data-test="recap-stake-line">
        {{ recap.recapStakeLine }}
      </p>
      <p v-if="recap.recapTokenStakeLine" data-test="recap-token-stake-line">
        {{ recap.recapTokenStakeLine }}
      </p>
      <p v-if="recap.recapSupplyLine" data-test="new-total-supply-recap">
        {{ recap.recapSupplyLine }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatUnits, isAddress } from 'viem'
import {
  useInvestorSymbol,
  useInvestorTotalSupply,
  useInvestorBalanceOf
} from '@/composables/investor/reads'
import { getMintRecap, TOKEN_DECIMALS } from '@/utils/investorMintAllocation'

const props = defineProps<{
  recipientAddress: string
  issuedAmount: number | null
  hasValidationError?: boolean
  validationMessage?: string
}>()

const { data: tokenSymbol } = useInvestorSymbol()
const { data: totalSupplyRaw } = useInvestorTotalSupply()
const { data: recipientBalanceRaw } = useInvestorBalanceOf(computed(() => props.recipientAddress))

const tokenSymbolValue = computed(() =>
  typeof tokenSymbol.value === 'string' ? tokenSymbol.value : undefined
)

const totalSupplyNumber = computed(() => {
  if (typeof totalSupplyRaw.value !== 'bigint') return 0
  return Number(formatUnits(totalSupplyRaw.value, TOKEN_DECIMALS))
})

const recipientBalanceNumber = computed(() => {
  if (typeof recipientBalanceRaw.value !== 'bigint') return 0
  return Number(formatUnits(recipientBalanceRaw.value, TOKEN_DECIMALS))
})

const currentStakePercentage = computed(() => {
  if (totalSupplyNumber.value === 0) return 0
  return (recipientBalanceNumber.value / totalSupplyNumber.value) * 100
})

const hasRecipientContext = computed(
  () =>
    typeof recipientBalanceRaw.value === 'bigint' &&
    typeof totalSupplyRaw.value === 'bigint' &&
    isAddress(props.recipientAddress)
)

const recap = computed(() =>
  getMintRecap(
    hasRecipientContext.value,
    props.issuedAmount,
    tokenSymbolValue.value,
    totalSupplyNumber.value,
    recipientBalanceNumber.value,
    currentStakePercentage.value,
    props.validationMessage
  )
)
</script>

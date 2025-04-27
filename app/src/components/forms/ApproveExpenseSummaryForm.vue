<template>
  <h3 class="font-bold mb-4">
    You are about to approve
    {{ budgetLimit.approvedAddress }}
    with the following limits:
  </h3>

  <h3 :key="limit.budgetType" v-for="limit in budgetLimit.budgetData">
    {{ limitType(limit.budgetType as 0 | 1 | 2) }}:
    <span class="font-bold">{{ limit.value }} {{ getToken(limit.budgetType as 0 | 1 | 2) }}</span>
  </h3>

  <h3 v-if="budgetLimit.expiry">
    Valid Until:
    <span class="font-bold">{{ new Date(budgetLimit.expiry * 1000).toLocaleString() }}</span>
  </h3>

  <div class="divider" />

  <div class="flex justify-between">
    <ButtonUI
      :disabled="loading"
      :loading="loading"
      variant="primary"
      @click="$emit('submit', budgetLimit)"
      data-test="approve-button"
      >Confirm Approval</ButtonUI
    >

    <ButtonUI
      outline
      variant="error"
      :disabled="loading"
      @click="$emit('close')"
      data-test="cancel-button"
      >Cancel</ButtonUI
    >
  </div>
</template>
<script setup lang="ts">
import { NETWORK, USDC_ADDRESS, USDT_ADDRESS } from '@/constant'
import { zeroAddress } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import type { BudgetLimit } from '@/types'

defineEmits(['submit', 'close'])

const props = defineProps<{
  budgetLimit: BudgetLimit
  loading: boolean
}>()

function limitType(type: 0 | 1 | 2): string {
  const budgetTypes = {
    0: 'Max Transaction per Period',
    1: 'Max Amount per Period',
    2: 'Max Amount per Transaction'
  }
  return budgetTypes[type]
}

function getToken(budgetType: 0 | 1 | 2): string {
  if (budgetType == 0) return ''

  const tokens = {
    [zeroAddress]: NETWORK.currencySymbol,
    [USDC_ADDRESS]: 'USDC',
    [USDT_ADDRESS]: 'USDT'
  }
  return tokens[props.budgetLimit.tokenAddress]
}
</script>

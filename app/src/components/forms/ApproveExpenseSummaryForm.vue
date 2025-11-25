<template>
  <h3 class="font-bold mb-4">
    You are about to approve
    {{ budgetLimit.approvedAddress }}
    with the following limits:
  </h3>

  <h3>
    Amount:
    <span class="font-bold"
      >{{ budgetLimit.amount }} {{ tokenSymbol(budgetLimit.tokenAddress) }}</span
    >
  </h3>

  <h3>
    Frequency:
    <span class="font-bold">{{ getFrequencyName(budgetLimit.frequencyType) }}</span>
  </h3>

  <h3 v-if="budgetLimit.startDate">
    Start Date:
    <span class="font-bold">{{ new Date(budgetLimit.startDate * 1000).toLocaleString() }}</span>
  </h3>

  <h3 v-if="budgetLimit.endDate">
    End Date:
    <span class="font-bold">{{ new Date(budgetLimit.endDate * 1000).toLocaleString() }}</span>
  </h3>

  <div class="divider" />

  <div class="flex justify-between">
    <ButtonUI
      outline
      variant="error"
      :disabled="loading"
      @click="$emit('close')"
      data-test="cancel-button"
      >Cancel</ButtonUI
    >
    <ButtonUI
      :disabled="loading"
      :loading="loading"
      variant="primary"
      @click="$emit('submit', budgetLimit)"
      data-test="approve-button"
      >Confirm Approval</ButtonUI
    >
  </div>
</template>
<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import type { BudgetLimit } from '@/types'
import { tokenSymbol } from '@/utils'
import { getFrequencyName } from '@/utils'

defineEmits(['submit', 'close'])

const props = defineProps<{
  budgetLimit: BudgetLimit
  loading: boolean
}>()
</script>

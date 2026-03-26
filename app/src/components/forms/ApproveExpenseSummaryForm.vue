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
    <span class="font-bold">{{ getFrequencyType(budgetLimit.frequencyType) }}</span>
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
    <UButton
      color="error"
      variant="outline"
      :disabled="loading"
      @click="$emit('close')"
      data-test="cancel-button"
      label="Cancel"
    />
    <UButton
      :disabled="loading"
      :loading="loading"
      color="primary"
      @click="$emit('submit', budgetLimit)"
      data-test="approve-button"
      label="Confirm Approval"
    />
  </div>
</template>
<script setup lang="ts">
import type { BudgetLimit } from '@/types'
import { tokenSymbol } from '@/utils'
import { getFrequencyType } from '@/utils'

defineEmits(['submit', 'close'])

defineProps<{
  budgetLimit: BudgetLimit
  loading: boolean
}>()
</script>

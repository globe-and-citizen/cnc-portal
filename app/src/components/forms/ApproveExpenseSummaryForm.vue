<template>
  <p class="mb-4 text-sm text-gray-500">
    Review the spending limits for
    <span class="font-semibold text-gray-800 dark:text-gray-200">{{
      budgetLimit.approvedAddress
    }}</span>
    before signing.
  </p>

  <div class="flex flex-col gap-2 text-sm">
    <div class="flex justify-between">
      <span class="text-gray-500">Max Amount</span>
      <span class="font-semibold"
        >{{ budgetLimit.amount }} {{ tokenSymbol(budgetLimit.tokenAddress) }}</span
      >
    </div>
    <div class="flex justify-between">
      <span class="text-gray-500">Frequency</span>
      <span class="font-semibold">{{ getFrequencyType(budgetLimit.frequencyType) }}</span>
    </div>
    <div v-if="budgetLimit.startDate" class="flex justify-between">
      <span class="text-gray-500">Start Date</span>
      <span class="font-semibold">{{
        new Date(budgetLimit.startDate * 1000).toLocaleString()
      }}</span>
    </div>
    <div v-if="budgetLimit.endDate" class="flex justify-between">
      <span class="text-gray-500">End Date</span>
      <span class="font-semibold">{{ new Date(budgetLimit.endDate * 1000).toLocaleString() }}</span>
    </div>
  </div>

  <USeparator class="my-4" />

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
      label="Sign & Approve"
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

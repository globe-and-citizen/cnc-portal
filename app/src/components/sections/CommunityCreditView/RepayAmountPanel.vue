<template>
  <div>
    <div class="mb-1.5 flex items-center justify-between">
      <label class="text-sm font-medium" for="repay-amount">Amount to repay now</label>
      <span class="text-muted text-xs">
        Treasury:
        <span data-test="repay-treasury-balance">{{
          treasuryBalance !== null ? formatAmount(treasuryBalance, token, 4) : '—'
        }}</span>
      </span>
    </div>
    <UInput
      id="repay-amount"
      v-model="amount"
      type="number"
      min="0"
      placeholder="0"
      size="xl"
      class="w-full text-lg font-bold"
      data-test="repay-amount-input"
    >
      <template #trailing>
        <span class="text-muted text-sm font-bold">{{ token }}</span>
      </template>
    </UInput>
    <div class="mt-2.5 flex gap-1.5">
      <UButton
        v-for="q in quick"
        :key="q.label"
        variant="outline"
        color="neutral"
        size="xs"
        :label="q.label"
        class="flex-1 justify-center"
        :data-test="`repay-quick-${q.label}`"
        @click="amount = String(q.value)"
      />
    </div>
    <span
      v-if="errors.amount"
      class="text-error mt-1.5 block text-xs"
      data-test="repay-amount-error"
    >
      {{ errors.amount }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import {
  applyZodFieldErrors,
  formatAmount,
  repayableCeiling,
  roundToDisplayPrecision
} from '@/utils'
import { createRepayAmountSchema } from '@/types'

const props = defineProps<{
  outstanding: number
  treasuryBalance: number | null
  token: string
}>()

const amount = defineModel<string>('amount', { required: true })
const numericAmount = computed(() => Math.max(0, Number(amount.value) || 0))

const maxRepayable = computed(() => repayableCeiling(props.outstanding, props.treasuryBalance))
const quick = computed(() => [
  { label: '25%', value: roundToDisplayPrecision(maxRepayable.value * 0.25) },
  { label: '50%', value: roundToDisplayPrecision(maxRepayable.value * 0.5) },
  { label: 'Max', value: maxRepayable.value }
])

const errors = reactive({ amount: '' })
const schema = computed(() =>
  createRepayAmountSchema({
    outstanding: props.outstanding,
    treasuryBalance: props.treasuryBalance ?? Infinity,
    tokenSymbol: props.token
  })
)
function validate(): boolean {
  const result = schema.value.safeParse({ amount: numericAmount.value })
  return applyZodFieldErrors(result, errors)
}

defineExpose({ validate })
</script>

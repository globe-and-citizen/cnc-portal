<template>
  <ul class="space-y-2">
    <li
      v-for="step in steps"
      :key="step.key"
      class="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
      :data-test="`${testPrefix}-step-${step.key}`"
    >
      <UIcon
        :name="STEP_ICON[step.status]"
        :class="['mt-0.5 size-5 shrink-0', STEP_ICON_CLASS[step.status]]"
      />
      <div class="min-w-0 flex-1">
        <p class="font-medium">{{ step.label }}</p>
        <p v-if="step.status === 'active' && step.detail" class="text-xs text-gray-500">
          {{ step.detail }}
        </p>
        <p
          v-if="step.status === 'failed' && step.error"
          class="text-error text-xs"
          :data-test="`${testPrefix}-error-${step.key}`"
        >
          {{ step.error }}
        </p>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { CashOutRunStep, CashOutStepStatus } from '@/composables/cashOut'

/**
 * Progress of a running cash-out sequence, one row per account.
 *
 * Purely presentational: every flow driving `useCashOutAll` renders the same
 * stepper, so the markup and the status→icon mapping live here rather than
 * being restated per call site. `testPrefix` keeps each flow's `data-test`
 * hooks distinct.
 */
defineProps<{
  steps: CashOutRunStep[]
  testPrefix: string
}>()

const STEP_ICON: Record<CashOutStepStatus, string> = {
  pending: 'i-heroicons-clock',
  active: 'i-heroicons-arrow-path',
  success: 'i-heroicons-check-circle',
  failed: 'i-heroicons-x-circle'
}

const STEP_ICON_CLASS: Record<CashOutStepStatus, string> = {
  pending: 'text-gray-400',
  active: 'animate-spin text-warning',
  success: 'text-success',
  failed: 'text-error'
}
</script>

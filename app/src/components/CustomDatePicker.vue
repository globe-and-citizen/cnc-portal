<!-- CustomDatePicker.vue -->
<!--
  Range date filter for the transaction-history tables.

  Thin adapter over the ported `AccountingDatePicker` (run in `range` mode): it keeps the
  legacy tuple contract (`v-model: [Date, Date] | null`) so the existing tables, their test
  stubs and `useTransactionTable` bind it unchanged, while delegating all of the UI and date
  logic to the shared picker. Defaults to "All time" and persists each table's selection
  under a `dataTestPrefix`-scoped key.
-->
<script setup lang="ts">
import { ref, watch } from 'vue'
import AccountingDatePicker from '@/components/AccountingDatePicker.vue'
import type { DatePickerValue } from '@/utils/datePicker'

interface Props {
  modelValue: [Date, Date] | null
  dataTestPrefix?: string
}

const props = withDefaults(defineProps<Props>(), {
  dataTestPrefix: 'date-picker'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: [Date, Date] | null): void
}>()

// Inner Range model handed to AccountingDatePicker; seeded from the incoming tuple (if any).
const range = ref<DatePickerValue | undefined>(
  props.modelValue ? { start: props.modelValue[0], end: props.modelValue[1] } : undefined
)

// Re-emit the resolved range to parents as the legacy `[start, end]` tuple.
watch(range, (value) => {
  if (value && !(value instanceof Date)) {
    emit('update:modelValue', [value.start, value.end])
  }
})
</script>

<template>
  <div :data-test="`${dataTestPrefix}-date-select`">
    <AccountingDatePicker
      v-model="range"
      mode="range"
      :storage-key="`transaction-history-range-${dataTestPrefix}`"
    />
  </div>
</template>

<template>
  <div class="flex items-center gap-2">
    <label class="shrink-0 text-sm font-medium" for="safe-transaction-status-select">Show</label>
    <USelect
      id="safe-transaction-status-select"
      v-model="selectedStatus"
      :items="statusOptions"
      value-key="value"
      size="lg"
      data-test="safe-transaction-status-filter"
      class="w-44"
    />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import type { SafeTransactionStatusFilter } from '@/utils/safeTransactionState'

const emit = defineEmits<{
  statusChange: [value: SafeTransactionStatusFilter]
}>()

const selectedStatus = defineModel<SafeTransactionStatusFilter>({ default: 'all' })

const statusOptions = [
  { value: 'all', label: 'All transactions' },
  { value: 'needs-action', label: 'Needs action' },
  { value: 'pending', label: 'Pending approvals' },
  { value: 'ready', label: 'Ready to execute' },
  { value: 'conflicting', label: 'Conflicting' },
  { value: 'executed', label: 'Executed' },
  { value: 'invalid', label: 'Invalid' }
]

watch(selectedStatus, (newValue) => {
  emit('statusChange', newValue)
})
</script>

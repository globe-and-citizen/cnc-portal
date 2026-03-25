<template>
  <div class="flex items-center gap-2">
    <label class="text-sm font-medium" for="safe-transaction-status-select">Status:</label>
    <USelect
      id="safe-transaction-status-select"
      v-model="selectedStatus"
      :items="statusOptions"
      size="sm"
      data-test="safe-transaction-status-filter"
      class="w-36"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

export type SafeTransactionStatus = 'all' | 'pending' | 'executed'

const emit = defineEmits<{
  statusChange: [value: SafeTransactionStatus]
}>()

const selectedStatus = ref<SafeTransactionStatus>('all')

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'executed', label: 'Executed' }
]

watch(selectedStatus, (newValue) => {
  emit('statusChange', newValue)
})
</script>

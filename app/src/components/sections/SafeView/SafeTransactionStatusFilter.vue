<template>
  <div class="flex items-center gap-2">
    <label class="text-sm font-medium" for="safe-transaction-status-select">Status:</label>
    <select
      id="safe-transaction-status-select"
      v-model="selectedStatus"
      class="select select-bordered select-sm"
      data-test="safe-transaction-status-filter"
    >
      <option value="all">All</option>
      <option value="pending">Pending</option>
      <option value="executed">Executed</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

export type SafeTransactionStatus = 'all' | 'pending' | 'executed'

const emit = defineEmits<{
  statusChange: [value: SafeTransactionStatus]
}>()

const selectedStatus = ref<SafeTransactionStatus>('all')

watch(selectedStatus, (newValue) => {
  emit('statusChange', newValue)
})
</script>

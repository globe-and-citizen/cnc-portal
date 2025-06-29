<template>
  <div class="flex items-center gap-2">
    <label class="text-sm font-medium">Status:</label>
    <select
      v-model="selectedStatus"
      class="select select-bordered select-sm"
      data-test="vesting-status-filter"
    >
      <option value="all">All</option>
      <option value="active">Active</option>
      <option value="completed">Completed</option>
      <option value="cancelled">Cancelled</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const emit = defineEmits<{
  (e: 'statusChange', value: string): void
}>()

const selectedStatus = ref('all')

watch(selectedStatus, (newValue) => {
  emit('statusChange', newValue)
})
</script>

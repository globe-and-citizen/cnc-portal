<template>
  <div class="flex items-center gap-2">
    <label class="text-sm font-medium" for="vesting-status-select">Status:</label>
    <select
      id="vesting-status-select"
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
import { type VestingStatus } from '@/types/vesting'
const emit = defineEmits<{
  (e: 'statusChange', value: VestingStatus): void
}>()

const selectedStatus = ref<VestingStatus>('all')

watch(selectedStatus, (newValue) => {
  emit('statusChange', newValue)
})
</script>

<template>
  <div class="flex items-center gap-2">
    <label class="text-sm font-medium" for="vesting-status-select">Status:</label>
    <USelect
      id="vesting-status-select"
      v-model="selectedStatus"
      :items="statusOptions"
      size="sm"
      data-test="vesting-status-filter"
      class="w-36"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { type VestingStatus } from '@/types/vesting'
const emit = defineEmits<{
  (e: 'statusChange', value: VestingStatus): void
}>()

const selectedStatus = ref<VestingStatus>('all')

const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' }
]

watch(selectedStatus, (newValue) => {
  emit('statusChange', newValue)
})
</script>

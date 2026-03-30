<template>
  <div class="flex items-center justify-center">
    <div
      v-if="status === 'completed'"
      class="bg-success flex h-6 w-6 items-center justify-center rounded-full"
      data-test="timeline-icon-completed"
    >
      <Icon icon="heroicons:check" class="h-4 w-4 text-white" />
    </div>
    <div
      v-else-if="status === 'active'"
      class="loading loading-spinner loading-md text-primary"
      data-test="timeline-icon-active"
    ></div>
    <div
      v-else-if="status === 'error'"
      class="bg-error flex h-6 w-6 items-center justify-center rounded-full"
      data-test="timeline-icon-error"
    >
      <Icon icon="heroicons:x-mark" class="h-4 w-4 text-white" />
    </div>
    <div
      v-else
      class="bg-secondary-content flex h-6 w-6 items-center justify-center rounded-full"
      data-test="timeline-icon-pending"
    >
      <Icon icon="heroicons:clock" class="h-4 w-4 text-gray-600" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<Props>()

import { Icon } from '@iconify/vue'

interface Props {
  status: 'pending' | 'active' | 'completed' | 'error'
}
</script>

<template>
  <div class="flex items-center justify-center">
    <div 
      v-if="status === 'completed'" 
      class="w-6 h-6 bg-success rounded-full flex items-center justify-center"
      data-test="timeline-icon-completed"
    >
      <Icon icon="heroicons:check" class="w-4 h-4 text-white" />
    </div>
    <div 
      v-else-if="status === 'active'" 
      class="loading loading-spinner loading-md text-primary"
      data-test="timeline-icon-active"
    ></div>
    <div 
      v-else-if="status === 'error'" 
      class="w-6 h-6 bg-error rounded-full flex items-center justify-center"
      data-test="timeline-icon-error"
    >
      <Icon icon="heroicons:x-mark" class="w-4 h-4 text-white" />
    </div>
    <div 
      v-else 
      class="w-6 h-6 bg-secondary-content rounded-full flex items-center justify-center"
      data-test="timeline-icon-pending"
    >
      <Icon icon="heroicons:clock" class="w-4 h-4 text-gray-600" />
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

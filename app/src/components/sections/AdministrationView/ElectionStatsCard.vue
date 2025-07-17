<template>
  <div class="flex-1 flex gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-300">
    <div :class="`p-3 bg-${color}-50 rounded-full`">
      <IconifyIcon :icon="`heroicons:${icon}`" :class="`h-6 w-6 text-${color}-600`" />
    </div>
    <div>
      <p class="text-sm font-medium text-gray-500">{{ title }}</p>
      <p class="text-xl font-semibold text-gray-900">
        {{ data }}
      </p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'

defineProps<{
  data: number | string | Date
  icon: string
  color: string
  title: string
}>()
</script>

<style scoped>
/* Add slight spacing between stats on smaller screens */
@media (max-width: 768px) {
  .flex.justify-between {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>

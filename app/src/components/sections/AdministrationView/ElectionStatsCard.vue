<template>
  <div class="flex-1 flex gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-300">
    <div
      class="p-1 rounded-full aspect-square flex items-center justify-center w-12 h-12"
      :class="`${bgColor}`"
    >
      <div style="width: 100%; height: 100%">
        <IconifyIcon
          :icon="`heroicons:${icon}-solid`"
          :class="`h-7 w-7 ${textColor}`"
          style="width: 100%; height: 100%"
        />
      </div>
    </div>
    <div>
      <p class="text-sm font-bold text-gray-400">{{ title }}</p>
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
  bgColor: string
  textColor: string
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

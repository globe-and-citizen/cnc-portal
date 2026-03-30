<template>
  <div class="flex flex-1 gap-4 rounded-lg border border-gray-300 bg-white p-4 shadow-xs">
    <div
      class="flex aspect-square h-12 w-12 items-center justify-center rounded-full p-1"
      :class="`${bgColor}`"
    >
      <IconifyIcon :icon="`heroicons:${icon}-solid`" :class="`h-7 w-7 ${textColor}`" />
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

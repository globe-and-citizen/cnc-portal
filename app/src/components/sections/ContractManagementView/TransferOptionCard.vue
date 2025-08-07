<template>
  <div
    class="flex-1 p-6 rounded-xl cursor-pointer transition-all duration-200"
    :class="cardClasses"
    @click="$emit('selected')"
  >
    <div class="flex flex-col items-center">
      <div :class="iconContainerClasses">
        <IconifyIcon :icon="icon" class="w-12 h-12" />
      </div>
      <span class="font-bold">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'

const props = defineProps<{ label: string; isSelected: boolean; icon: string }>()

defineEmits(['selected'])

const cardClasses = computed(() => ({
  'bg-blue-50 border-2 border-blue-500': props.isSelected,
  'bg-gray-100 border border-gray-300': !props.isSelected
}))

const iconContainerClasses = computed(() => ({
  'w-24 h-24 mb-4 flex items-center justify-center rounded-full': true,
  'bg-blue-100 text-blue-600': props.isSelected,
  'bg-gray-200 text-gray-600': !props.isSelected
}))
</script>

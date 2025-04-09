<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  size: {
    type: [String, Number],
    default: '24'
  },
  color: {
    type: String,
    default: 'currentColor'
  },
  class: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <IconifyIcon
    :icon="props.icon"
    :width="props.size"
    :height="props.size"
    :color="props.color"
    :class="props.class"
  />
</template>

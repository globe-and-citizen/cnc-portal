<template>
  <div class="tooltip" :class="`tooltip-${position}`" :data-tip="content">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
defineProps({
  content: String,
  position: {
    type: String,
    default: 'top'
  }
})
</script>

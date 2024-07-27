<template>
  <div class="tooltip" :data-tip="content">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  content: string
}>()
</script>

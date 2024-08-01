<template>
  <button class="btn" :class="`btn-${color}`">
    <span class="loading loading-spinner loading-sm text-white"></span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  color: string
}>()
</script>

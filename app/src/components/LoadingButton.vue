<template>
  <button class="btn w-full" :class="`btn-${color}`">
    <span class="loading loading-spinner loading-sm text-white"></span>
  </button>
</template>


<script setup lang="ts">
defineProps<{
  color: string
}>()
</script>
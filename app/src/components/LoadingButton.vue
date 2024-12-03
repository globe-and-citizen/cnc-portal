<template>
  <ButtonUI :class="`btn-${color}`">
    <span class="loading loading-spinner loading-sm text-white"></span>
  </ButtonUI>
</template>

<script setup lang="ts">
import ButtonUI from './ButtonUI.vue';

defineProps<{
  color: string
}>()
</script>

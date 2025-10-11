<template>
  <div class="flex flex-col">
    <p class="text-sm font-medium text-blue-gray-700 mb-1">{{ title }}</p>
    <div class="rounded-lg border border-blue-gray-200 bg-gray-50 p-3 flex-1">
      <slot></slot>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ title: string }>()
</script>

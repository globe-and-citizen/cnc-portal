<template>
  <div class="flex flex-col">
    <p class="text-blue-gray-700 mb-1 text-sm font-medium">{{ title }}</p>
    <div class="border-blue-gray-200 flex-1 rounded-lg border bg-gray-50 p-3">
      <slot></slot>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ title: string }>()
</script>

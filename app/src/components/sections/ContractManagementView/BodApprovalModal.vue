<template>
	<div class="flex-1 flex gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-300">
    <div
      class="p-1 rounded-full aspect-square flex items-center justify-center w-12 h-12 bg-gray-200"
    >
      <IconifyIcon icon="heroicons:arrow-right" class="h-7 w-7 text-gray-600" />
    </div>
    <div>
      <p class="text-xl font-semibold text-gray-900">
        Ownership Transfer Request
      </p>
      <p class="text-gray-400">Request to transfer ownership of contract to....</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
</script>
<template>
  <div class="bg-base-200 p-4 rounded-xl space-y-3">
    <div class="flex justify-between text-sm">
      <span class="text-gray-500">Price per share</span>
      <span class="font-mono">${{ price.toFixed(2) }}</span>
    </div>
    <div class="flex justify-between text-sm">
      <span class="text-gray-500">Shares</span>
      <span class="font-mono">{{ shares || '0' }}</span>
    </div>
    <div class="divider my-1"></div>
    <div class="flex justify-between">
      <span class="font-medium">Total Cost</span>
      <span class="font-mono text-lg text-primary"> ${{ total.toFixed(2) }} USDC </span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  price: number
  shares: number | string
  total: number
}>()
</script>

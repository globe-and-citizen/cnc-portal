<template>
  <div class="flex justify-center mb-10">
    <div class="grid grid-cols-2 gap-8" style="width: 500px">
      <div
        v-for="step in steps"
        :key="step.id"
        :class="[
          'text-center transition-opacity duration-300',
          currentStep >= step.id ? 'opacity-100' : 'opacity-50'
        ]"
      >
        <p class="font-medium text-sm">{{ step.title }}</p>
        <p class="text-xs text-gray-500 mt-1">{{ step.description }}</p>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  steps: Array<{ id: number; title: string; description: string }>
  currentStep: number
}>()
</script>

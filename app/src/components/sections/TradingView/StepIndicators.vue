<template>
  <div class="flex items-center justify-center mb-10">
    <div v-for="(step, index) in steps" :key="step.id" class="flex items-center">
      <div
        :class="[
          'step-indicator',
          currentStep > step.id && 'completed',
          currentStep === step.id && 'active',
          currentStep < step.id && 'pending'
        ]"
      >
        <IconifyIcon v-if="currentStep > step.id" icon="heroicons:check-20-solid" class="w-5 h-5" />
        <span v-else>{{ step.id }}</span>
      </div>
      <div
        v-if="index < steps.length - 1"
        :class="[
          'w-20 h-0.5 mx-2 transition-colors duration-300',
          currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
        ]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
defineProps<{
  steps: Array<{ id: number; title: string; description: string }>
  currentStep: number
}>()
</script>

<style scoped>
.step-indicator {
  @apply w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all duration-300;
}

.step-indicator.completed {
  @apply border-green-500 bg-green-500 text-white;
}

.step-indicator.active {
  @apply border-primary bg-primary text-white;
}

.step-indicator.pending {
  @apply border-gray-300 bg-white text-gray-500;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

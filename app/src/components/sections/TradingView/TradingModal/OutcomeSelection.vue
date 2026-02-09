<template>
  <div class="space-y-2">
    <label class="text-sm text-gray-500">Select Outcome</label>
    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="(outcome, index) in outcomes"
        :key="outcome.name"
        @click="$emit('set-selected-outcome', index)"
        :class="[
          'p-4 rounded-xl border transition-all duration-200 text-left',
          selectedOutcome === index
            ? 'border-primary bg-primary/10'
            : 'border-base-300 bg-base-200 hover:border-primary/50'
        ]"
      >
        <span class="font-semibold">{{ outcome.name }}</span>
        <p class="font-mono text-lg text-primary mt-1">
          {{ (outcome.buyPrice * 100).toFixed(1) }}¢
        </p>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  outcomes: Array<{ name: string; buyPrice: number }>
  selectedOutcome: number
}>()

defineEmits(['set-selected-outcome'])
</script>

<template>
  <div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Transaction summary">
    <div v-for="item in summaryItems" :key="item.key" class="rounded-lg p-3" :class="item.class">
      <p class="text-xs font-medium" :class="item.labelClass">{{ item.label }}</p>
      <p class="mt-1 text-xl font-semibold" :data-test="`${item.key}-transaction-count`">
        {{ counts[item.key] }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  counts: Record<'pending' | 'ready' | 'conflicting' | 'executed', number>
}

defineProps<Props>()

const summaryItems = [
  {
    key: 'pending' as const,
    label: 'Pending',
    class: 'bg-gray-50 dark:bg-gray-800/60',
    labelClass: 'text-gray-500'
  },
  {
    key: 'ready' as const,
    label: 'Ready',
    class: 'bg-blue-50 dark:bg-blue-950/30',
    labelClass: 'text-blue-700 dark:text-blue-300'
  },
  {
    key: 'conflicting' as const,
    label: 'Conflicting',
    class: 'bg-amber-50 dark:bg-amber-950/30',
    labelClass: 'text-amber-700 dark:text-amber-300'
  },
  {
    key: 'executed' as const,
    label: 'Executed',
    class: 'bg-green-50 dark:bg-green-950/30',
    labelClass: 'text-green-700 dark:text-green-300'
  }
]
</script>

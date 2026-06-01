<template>
  <UPopover :content="{ side: 'bottom', align: 'start' }">
    <button
      type="button"
      class="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted hover:text-default focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
      :aria-label="`Explain ${title}`"
    >
      <UIcon name="i-lucide-info" class="w-4 h-4" />
    </button>

    <template #content>
      <div class="p-3 max-w-sm space-y-2 text-sm">
        <p class="font-semibold text-default">
          {{ title }}
        </p>
        <p class="text-muted">
          {{ description }}
        </p>
        <div v-if="formula" class="rounded bg-muted/40 px-2 py-1.5 text-xs font-mono text-default">
          {{ formula }}
        </div>
        <p v-if="example" class="text-xs text-muted italic">
          {{ example }}
        </p>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
/**
 * Tiny info-button + popover that explains, in plain language, what a Summary
 * metric is and how it's computed. Lives next to each metric label so a
 * non-accountant can audit the books without leaving the page.
 */
defineProps<{
  title: string
  description: string
  formula?: string
  example?: string
}>()
</script>

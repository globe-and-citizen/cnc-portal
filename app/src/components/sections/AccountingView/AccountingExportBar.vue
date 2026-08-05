<template>
  <div class="flex flex-col items-end gap-1">
    <div class="flex items-center gap-2">
      <UButton
        color="neutral"
        variant="soft"
        icon="i-heroicons-arrow-down-tray"
        label="Export to Excel"
        data-test="export-excel"
        @click="emit('export')"
      />
      <UButton
        color="neutral"
        variant="soft"
        icon="i-heroicons-printer"
        label="Print to PDF"
        data-test="export-pdf"
        @click="emit('print')"
      />
    </div>
    <!-- Context line — e.g. which filters an export will honour. -->
    <p v-if="context" class="text-dimmed text-xs tabular-nums" data-test="export-context">
      {{ context }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ context?: string }>()
const emit = defineEmits<{ export: []; print: [] }>()
</script>

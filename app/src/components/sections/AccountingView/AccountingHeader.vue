<template>
  <div class="mb-1 flex flex-wrap items-end justify-between gap-4">
    <div>
      <span class="text-2xl font-bold tracking-tight">Accounting</span>
      <div class="text-muted mt-1.5 text-sm">Double-entry books for every on-chain movement</div>
    </div>

    <div class="flex items-end gap-2">
      <UButton
        color="neutral"
        variant="soft"
        icon="i-heroicons-arrow-down-tray"
        label="Export to Excel"
        @click="emit('export')"
      />
      <UButton
        color="neutral"
        variant="soft"
        icon="i-heroicons-printer"
        label="Print to PDF"
        @click="emit('print')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ export: []; print: [] }>()
</script>

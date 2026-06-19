<template>
  <div class="mb-1 flex flex-wrap items-end justify-between gap-4">
    <div>
      <span class="text-2xl font-bold tracking-tight">Accounting</span>
      <div class="text-muted mt-1.5 text-sm">Double-entry books for every on-chain movement</div>
    </div>

    <UButton
      color="neutral"
      variant="soft"
      icon="i-heroicons-arrow-down-tray"
      label="Export to Excel"
      @click="emit('export')"
    />
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ export: [] }>()
</script>

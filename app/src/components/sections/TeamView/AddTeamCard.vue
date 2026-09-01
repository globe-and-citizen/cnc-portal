<template>
  <!-- A real button, not a clickable div: the tile is the only way to start a
       company, so it has to be focusable and announced as a control. -->
  <UCard
    as="button"
    type="button"
    :ui="{
      root: 'flex min-h-60 w-full flex-col border-2 border-dashed border-primary bg-primary/5 text-left shadow-none ring-0',
      body: 'flex flex-1 flex-col items-center justify-center gap-2'
    }"
    data-test="add-team"
  >
    <IconifyIcon
      icon="heroicons:plus-circle"
      class="text-primary size-8"
      data-test="add-team-icon"
    />
    <!-- The design tints this label with its primary-700; this theme has no
         numeric shades, and plain `text-primary` on the mint fill only reaches
         2.2:1. `text-highlighted` keeps it readable and flips with the theme,
         leaving the icon to carry the green. -->
    <span class="text-highlighted text-sm font-semibold">Create Company</span>
  </UCard>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
</script>

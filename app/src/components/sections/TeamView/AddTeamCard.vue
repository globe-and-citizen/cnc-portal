<template>
  <UCard class="flex items-center justify-center bg-green-100">
    <div class="flex flex-col items-center justify-center gap-2">
      <span class="font-bold">Create Company</span>

      <div class="h-5 w-5 cursor-pointer" data-test="add-team">
        <IconifyIcon icon="heroicons:plus-circle" class="size-6" data-test="add-team-icon" />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
</script>

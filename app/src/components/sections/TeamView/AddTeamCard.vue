<template>
  <div class="card flex items-center justify-center border bg-green-100">
    <div class="card-body flex items-center justify-center">
      <span class="font-bold">Create Company</span>

      <div class="h-5 w-5 cursor-pointer" data-test="add-team">
        <IconifyIcon icon="heroicons:plus-circle" class="size-6" data-test="add-team-icon" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
</script>

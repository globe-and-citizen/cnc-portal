<template>
  <div class="card bg-green-100 flex justify-center items-center border">
    <div class="card-body flex justify-center items-center">
      <span class="font-bold">Add Team</span>

      <div class="w-5 h-5 cursor-pointer" data-test="add-team" @click="$emit('openAddTeamModal')">
        <IconifyIcon icon="heroicons:plus-circle" class="size-6" data-test="add-team-icon" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
const emits = defineEmits(['openAddTeamModal'])
</script>

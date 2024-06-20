<template>
  <div class="card bg-green-100 flex justify-center items-center border">
    <div class="card-body flex justify-center items-center">
      <h1 class="card-title">Add Team</h1>

      <div class="w-6 h-6 cursor-pointer" @click="emits('openAddTeamModal')">
        <IconPlus />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconPlus from '@/components/icons/IconPlus.vue'
const emits = defineEmits(['openAddTeamModal'])
</script>

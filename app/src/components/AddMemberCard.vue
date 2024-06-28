<template>
  <div class="card w-44 h-4 bg-base-100 flex flex-row justify-center items-center">
    <span
      class="w-4 h-4 cursor-pointer flex justify-center items-center"
      @click="emits('toggleAddMemberModal')"
    >
      <IconPlus />
    </span>
    <span class="flex justify-center items-center">Add Member</span>
  </div>
</template>
<script setup lang="ts">
import IconPlus from '@/components/icons/IconPlus.vue'

const emits = defineEmits(['toggleAddMemberModal'])
</script>

<template>
  <div class="card bg-green-100 flex justify-center items-center border">
    <div class="card-body flex justify-center items-center">
      <span class="font-bold">{{ props.text }}</span>

      <div class="w-5 h-5 cursor-pointer" @click="emits('openAddResourceModal')">
        <PlusCircleIcon class="size-6" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlusCircleIcon } from '@heroicons/vue/24/outline'
const emits = defineEmits(['openAddResourceModal'])
const props = defineProps(['text'])
</script>

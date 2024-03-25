<template>
  <div className="card bg-white shadow-xl flex flex-row justify-between h-[83px] w-full">
    <div className="card-body flex flex-col justify-center">
      <p class="text-[#212B36]">{{ member.name }}</p>
      <p class="text-[#212B36]">{{ member.address }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Member } from '@/stores/member'

defineProps<{ member: Member }>()
</script>

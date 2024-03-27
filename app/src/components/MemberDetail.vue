<template>
  <div className="card bg-white shadow-xl flex flex-row justify-between h-20 w-full">
    <div className="card-body flex flex-col justify-center">
      <p class="text-primary-content">{{ member.name }}</p>
      <p class="text-primary-content">{{ member.address }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Member } from '@/stores/member'

defineProps<{ member: Member }>()
</script>

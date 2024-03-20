<template>
  <div className="card bg-neutral shadow-xl flex flex-row justify-between">
    <div className="card-body">
      <h2 className="card-title text-primary">{{ member.id }}</h2>
      <p class="text-primary">{{ member.name }}</p>
      <p class="text-primary">{{ member.address }}</p>
    </div>
    <div className="card-actions flex flex-col justify-center mr-[30px]">
        <button className="btn btn-primary">Push Tips</button>
        <button className="btn btn-secondary">Send Tips</button>
      </div>
  </div>
</template>

<script setup lang="ts">
import type { Member } from '@/stores/member'

defineProps<{ member: Member }>()
</script>

<template>
  <div class="card bg-white">
    <div class="card-body">
      <h1 class="card-title">{{ props.team.name }}</h1>
      <p class="text-sm">{{ props.team.description }}</p>
      <div class="card-actions justify-between"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Team } from '@/types/team';
interface Props{
  team: Team
}
const props = defineProps<Props>()
</script>

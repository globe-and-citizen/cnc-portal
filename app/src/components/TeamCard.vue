<template>
  <div class="card w-80 bg-white ml-5 mt-5">
    <div class="card-body">
      <h1 class="card-title">{{ props.TeamName }}</h1>
      <p class="text-sm">{{ props.TeamDescription }}</p>
      <div class="card-actions justify-between"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps(['TeamName', 'TeamDescription'])
</script>

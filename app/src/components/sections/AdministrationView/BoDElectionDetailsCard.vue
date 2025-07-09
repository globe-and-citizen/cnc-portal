<template>
  <div class="bg-base-100 card border border-gray-200 flex flex-col">
    <div class="card-body">
      <UserComponent layout="alternate" :user="election.user" />

      <!-- View Results Button -->
      <ButtonUI variant="success" :outline="true"> View Results </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import UserComponent from './UserComponent.vue'

defineProps({
  election: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
/* Optional custom styles */
</style>

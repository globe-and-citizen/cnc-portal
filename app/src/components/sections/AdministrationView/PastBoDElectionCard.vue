<template>
  <div class="bg-base-100 shadow-lg card border border-gray-200 flex flex-col">
    <div class="card-body">
      <!-- Status and Date -->
      <div class="flex justify-between items-start mb-3">
        <span class="badge bg-gray-100"> Completed </span>
        <span class="text-gray-600">
          {{ formatDate(election.endDate) }}
        </span>
      </div>

      <!-- Election Title -->
      <h3 class="text-xl font-bold mb-4 text-left">{{ election.title }}</h3>

      <!-- Candidates Count -->
      <div class="flex justify-between items-center mb-2">
        <span class="text-gray-600">Candidates:</span>
        <span class="font-semibold">{{ election.candidates }}</span>
      </div>

      <!-- Votes Count -->
      <div class="flex justify-between items-center mb-4">
        <span class="text-gray-600">Total Votes:</span>
        <span class="font-semibold">{{ election.totalVotes }}</span>
      </div>

      <div class="flex-grow"></div>
      <!-- Spacer -->

      <!-- Elected Members -->
      <div class="mb-2 mb-5">
        <p class="text-gray-600 mb-2">Elected Members:</p>
        <div class="flex flex-wrap gap-2">
          <span v-for="(member, i) in election.electedMembers" :key="i" class="badge badge-info">
            {{ member }}
          </span>
        </div>
      </div>

      <!-- View Results Button -->
      <ButtonUI variant="success" :outline="true"> View Results </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'

defineProps({
  election: {
    type: Object,
    required: true
  }
})

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<style scoped>
/* Optional custom styles */
</style>

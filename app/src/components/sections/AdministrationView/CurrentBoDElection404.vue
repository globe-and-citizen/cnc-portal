<template>
  <div
    class="flex flex-col items-center justify-center gap-4 p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-100 mt-4"
  >
    <h2 class="text-xl font-semibold text-gray-700">No Current Election</h2>
    <p class="text-sm text-gray-500 text-center">
      There is no active election at the moment. Please check back later or create a new election.
    </p>
    <ButtonUI
      variant="primary"
      size="md"
      @click="() => emits('showCreateElectionModal')"
      data-test="create-election"
    >
      Create Election
    </ButtonUI>
  </div>
</template>
<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'

const emits = defineEmits(['showCreateElectionModal'])
</script>

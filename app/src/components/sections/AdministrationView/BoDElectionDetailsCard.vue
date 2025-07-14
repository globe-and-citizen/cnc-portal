<template>
  <div class="bg-base-100 card border border-gray-300 flex flex-col">
    <div class="card-body">
      <!-- User Component -->
      <UserComponent layout="alternate" :user="election.user" />

      <!-- Votes Stat - Right-aligned below UserComponent -->
      <div class="flex justify-end mt-2">
        <span class="text-lg font-bold text-gray-700">
          {{ election.currentVotes }}/{{ election.totalVotes }}
        </span>
      </div>

      <!-- Custom Divider -->
      <div class="flex items-center my-2">
        <div class="w-6 h-6 rounded-full border-4 border-gray-600"></div>
        <div class="flex-1 border-t-4 border-gray-200"></div>
      </div>

      <!-- View Results Button -->
      <ButtonUI
        variant="success"
        :outline="true"
        @click="() => emits('castVote', election.user.address)"
        >Cast a Vote</ButtonUI
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import UserComponent from './UserComponent.vue'
import type { PropType } from 'vue'
import type { User } from '@/types'

defineProps({
  election: {
    type: Object as PropType<{
      user: User
      currentVotes: number
      totalVotes: number
    }>,
    required: true
  }
})

const emits = defineEmits(['castVote'])
</script>

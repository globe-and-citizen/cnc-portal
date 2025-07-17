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
      <!-- <div class="flex items-center my-2">
        <div class="w-6 h-6 rounded-full border-4 border-gray-600"></div>
        <div class="flex-1 border-t-4 border-gray-200"></div>
      </div> -->

      <progress
        class="progress progress-success my-4"
        :value="election.currentVotes"
        :max="election.totalVotes"
      ></progress>

      <!-- View Results Button -->
      <ButtonUI
        variant="success"
        :outline="true"
        :disabled="hasVoted"
        @click="() => emits('castVote', election.user.address)"
        >Cast a Vote</ButtonUI
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import UserComponent from './UserComponent.vue'
import { computed, type PropType } from 'vue'
import type { User } from '@/types'
import { useReadContract } from '@wagmi/vue'
import { useUserDataStore, useTeamStore } from '@/stores'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import type { Address } from 'viem'

const props = defineProps({
  election: {
    type: Object as PropType<{
      user: User
      currentVotes: number
      totalVotes: number
      id: bigint
    }>,
    required: true
  }
})

const emits = defineEmits(['castVote'])

const userDataStore = useUserDataStore()
const teamStore = useTeamStore()

const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections') as Address)

const { data: hasVoted } = useReadContract({
  functionName: 'hasVoted',
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  args: [props.election.id, userDataStore.address as Address]
})
</script>

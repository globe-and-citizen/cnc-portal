<template>
  <UCard
    class="relative flex flex-col !overflow-visible"
    :class="{ 'border-warning': candidate.isElectionWinner }"
  >
    <!-- Winner Badge (aligned to straddle border) -->
    <UBadge
      v-if="candidate.isElectionWinner"
      color="warning"
      variant="solid"
      size="lg"
      class="absolute top-0 right-0 z-10 -translate-x-1/4 -translate-y-1/2 gap-2 border-2 border-white shadow-lg"
    >
      <span class=""> Winner </span>
    </UBadge>
    <!-- Candidate identity -->
    <ElectionCandidateIdentity layout="alternate" :user="candidate" />

    <!-- Vote count, right-aligned below the candidate identity -->
    <div class="mt-2 flex justify-end">
      <span class="text-lg font-bold text-gray-700">
        {{ candidate.currentVotes }}/{{ candidate.totalVotes }}
      </span>
    </div>

    <UProgress
      class="my-4"
      color="success"
      :model-value="candidate.currentVotes"
      :max="Math.max(candidate.totalVotes, 1)"
    />

    <!-- Conditional Button/Indicator -->
    <div
      v-if="candidate.isSelected"
      class="border-warning text-warning inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 px-6 py-3 text-base font-bold"
    >
      <IconifyIcon icon="heroicons-solid:check" class="h-5 w-5" />
      <span>Your Vote</span>
    </div>

    <!-- View Results Button -->
    <UTooltip v-else :text="candidate.voteTooltip">
      <UButton
        color="success"
        variant="outline"
        :disabled="candidate.isVoteDisabled"
        :loading="isLoadingCastVoteLocal && isLoading"
        @click="onCastVote"
        label="Cast a Vote"
      />
    </UTooltip>
  </UCard>
</template>

<script setup lang="ts">
import ElectionCandidateIdentity from './ElectionCandidateIdentity.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { watch, ref } from 'vue'
import type { User } from '@/types'
import type { Address } from 'viem'

const props = withDefaults(
  defineProps<{
    candidate: Pick<User, 'address' | 'name' | 'imageUrl'> & {
      role?: string
      currentVotes: number
      totalVotes: number
      isSelected: boolean
      isElectionWinner: boolean
      isVoteDisabled: boolean
      voteTooltip?: string
    }
    isLoading?: boolean
  }>(),
  { isLoading: false }
)

const emits = defineEmits(['castVote'])

const isLoadingCastVoteLocal = ref(false)

function onCastVote() {
  if (props.candidate.isVoteDisabled) return
  isLoadingCastVoteLocal.value = true
  emits('castVote', props.candidate.address as Address)
}

watch(
  () => props.isLoading,
  (newState) => {
    if (!newState) isLoadingCastVoteLocal.value = false
  }
)
</script>

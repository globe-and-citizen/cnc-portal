<template>
  <div>
    <h2>{{ proposal.title }}</h2>

    <span class="text-sm"> {{ proposal.description }}</span>

    <hr />

    <div class="flex flex-col gap-4 mt-4">
      <div class="flex flex-col gap-2" v-if="!proposal.isElection">
        <span class="text-sm">Yes: {{ proposal.votes?.yes }}</span>
        <span class="text-sm">No: {{ proposal.votes?.no }}</span>
        <span class="text-sm">Abstain: {{ proposal.votes?.abstain }}</span>
      </div>
    </div>
    <div class="flex flex-col gap-2" v-if="proposal.isElection">
      <span
        class="text-sm"
        v-for="candidate in proposal.candidates"
        :key="candidate.candidateAddress"
      >
        {{ candidate.name }} : {{ candidate.votes }}
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Proposal } from '@/types/index'
defineProps<{
  proposal: Partial<Proposal>
}>()
</script>

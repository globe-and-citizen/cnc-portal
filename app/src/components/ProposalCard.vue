<template>
  <div class="card shadow-xl" :class="`${proposal.isElection ? 'bg-green-100' : 'bg-blue-100'}`">
    <div class="card-body flex flex-row justify-between">
      <div class="w-1/2">
        <h2 class="card-title">{{ proposal.title }}</h2>
        <span class="text-xs">
          <span class="badge badge-primary badge-xs"> {{ proposal.draftedBy }}</span>

          <!-- on
          <span class="badge badge-secondary badge-xs">
            {{ new Date().toLocaleDateString() }}</span
          > -->
        </span>
        <p class="text-sm">
          {{
            proposal.description
              ? proposal.description.length > 120
                ? proposal.description.substring(0, 120) + '...'
                : proposal.description
              : ''
          }}
        </p>
      </div>
      <div
        class="flex flex-row items-center justify-center gap-5 w-1/2"
        v-if="!proposal.isElection"
      >
        <div class="flex flex-col items-center justify-center gap-2 text-sm">
          <span>Yes </span>
          <span>No </span>
          <span>Abstain </span>
        </div>
        <div class="flex flex-col items-center justify-center gap-5">
          <progress
            class="progress progress-success w-56"
            :value="Number(proposal.votes?.yes)"
            max="100"
          ></progress>
          <progress
            class="progress progress-success w-56"
            :value="Number(proposal.votes?.no)"
            max="100"
          ></progress>
          <progress
            class="progress progress-success w-56"
            :value="Number(proposal.votes?.abstain)"
            max="100"
          ></progress>
        </div>
      </div>
      <div class="flex flex-row items-center justify-center gap-5 w-1/2" v-else>
        <div class="flex flex-col items-center justify-center gap-2 text-sm">
          <span v-for="user in (proposal as any).candidates.slice(0, 3)" :key="user.address">{{
            user.name
          }}</span>
        </div>
        <div class="flex flex-col items-center justify-center gap-5">
          <progress
            class="progress progress-success w-56"
            v-for="user in (proposal as any).candidates.slice(0, 3)"
            :key="user.address"
            :value="Number(user?.votes)"
          ></progress>
        </div>
      </div>
    </div>
    <div class="flex justify-center gap-4 mb-2" v-if="!isDone">
      <button class="btn btn-primary btn-sm">Vote</button>
      <button class="btn btn-secondary btn-sm">View</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Proposal } from '@/types/index'
defineProps<{
  proposal: Partial<Proposal>
  isDone?: boolean
}>()
</script>

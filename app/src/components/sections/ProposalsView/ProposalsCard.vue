<template>
  <div
    class="flex w-full cursor-pointer flex-col gap-2 rounded-lg border bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
  >
    <div class="flex flex-col">
      <div class="flex flex-row justify-between">
        <div class="text-lg font-bold">{{ title }}</div>
        <div
          :class="{
            'bg-purple-600': state == ProposalState.Active,
            'bg-green-500': state == ProposalState.Approved,
            'bg-red-500': state == ProposalState.Rejected,
            'bg-gray-300': state == ProposalState.Tied
          }"
          class="rounded-full px-2 py-1"
        >
          {{
            state == ProposalState.Active
              ? 'Active'
              : state == ProposalState.Approved
                ? 'Approved'
                : state == ProposalState.Rejected
                  ? 'Rejected'
                  : 'Tied'
          }}
        </div>
      </div>
      <div class="flex flex-col">
        <div class="flex flex-row items-center gap-2 text-gray-500">
          <IconifyIcon icon="heroicons:user" />
          <div>{{ creator }}</div>
          <IconifyIcon icon="heroicons:calendar" />
          {{
            new Date(Number(startDate) * 1000).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          }}
          -
          {{
            new Date(Number(endDate) * 1000).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          }}
        </div>
      </div>
    </div>
    <div class="text-gray-500">{{ description }}</div>
    <div class="flex flex-row items-center justify-between">
      <div class="flex flex-row gap-4 text-sm text-gray-500">
        <div>{{ voteCount }}/{{ totalVoters }} votes cast</div>
        <div class="flex flex-row gap-2">
          <span class="text-green-500">{{ yesCount }} For</span>
          <span class="text-red-500">{{ noCount }} Against</span>
          <span class="text-gray-500">{{ abstainCount }} Abstain</span>
        </div>
      </div>
      <div
        class="cursor-pointer rounded-lg p-2 hover:bg-gray-300"
        @click="
          router.replace({
            name: 'proposal-detail',
            params: { proposalId: id.toString() }
          })
        "
      >
        View Details
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import { ProposalState, type Proposal } from '@/types'
import { useRouter } from 'vue-router'

const router = useRouter()
const props = defineProps<Proposal>()
console.log({ proposals: props })
</script>

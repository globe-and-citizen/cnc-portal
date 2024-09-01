<template>
  <div>
    <h2>{{ proposal.title }}</h2>

    <span class="text-sm"> {{ proposal.description }}</span>

    <hr />

    <div class="h-40" v-if="!proposal.isElection">
      <PieChart :data="chartData" title="Directive" />
    </div>
    <div class="h-40" v-else>
      <PieChart :data="chartData" title="Election" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, defineProps } from 'vue'
import PieChart from '@/components/PieChart.vue'
import type { Member } from '@/types'
const props = defineProps(['proposal', 'team'])
const chartData = computed(() => {
  const votes = props.proposal.votes || {}
  if (props.proposal.isElection) {
    return (props.proposal as any).candidates.map((candidate: any) => {
      const member = props.team.members.find((member: Member) => member.address === candidate[0])
      return {
        value: Number(candidate.votes) || 0,
        name: member ? member.name : 'Unknown'
      }
    })
  } else {
    return [
      { value: Number(votes.yes) || 0, name: 'Yes' },
      { value: Number(votes.no) || 0, name: 'No' },
      { value: Number(votes.abstain) || 0, name: 'Abstain' }
    ]
  }
})
</script>

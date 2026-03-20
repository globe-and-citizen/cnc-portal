<script setup lang="ts">
import { computed } from 'vue'
import type { Team } from '@/types'
import InvestorContractStep from './InvestorContractStep.vue'

const props = defineProps<{
  team: Partial<Team>
}>()

defineEmits(['done'])

const stepperItems = computed(() => [
  { title: 'Team Details', value: 1 },
  { title: props.team.members?.length ? `Members (${props.team.members.length})` : 'Members', value: 2 },
  { title: 'Investor Contract', value: 3 },
])
</script>

<template>
  <div class="flex flex-col gap-5">
    <UStepper :model-value="2" :items="stepperItems" disabled class="w-full mb-4" />
    <InvestorContractStep
      :team="props.team"
      :show-skip="true"
      @skip="$emit('done')"
      @contractDeployed="$emit('done')"
    />
  </div>
</template>

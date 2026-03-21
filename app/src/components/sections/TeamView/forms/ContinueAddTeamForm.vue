<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Team } from '@/types'
import InvestorContractStep from './InvestorContractStep.vue'

const props = defineProps<{
  team: Partial<Team>
}>()

const emit = defineEmits(['done'])

const open = ref(false)

const stepperItems = computed(() => [
  { title: 'Team Details', value: 1 },
  {
    title: props.team.members?.length ? `Members (${props.team.members.length})` : 'Members',
    value: 2
  },
  { title: 'Investor Contract', value: 3 }
])

const handleDone = () => {
  open.value = false
  emit('done')
}
</script>

<template>
  <div>
    <p class="text-sm">
      You have created your team, but the necessary smart contracts for its management haven't been
      deployed yet.
      <UButton size="sm" variant="outline" @click="open = true">Click here</UButton>
      to proceed with the deployment.
    </p>
    <UModal
      v-model:open="open"
      title="Deploy Team Contracts"
      description="Complete your team setup by deploying the required contracts."
    >
      <template #body>
        <div class="flex flex-col gap-5">
          <UStepper :model-value="2" :items="stepperItems" disabled class="w-full mb-4" />
          <InvestorContractStep
            :team="props.team"
            :show-skip="true"
            @skip="handleDone"
            @contractDeployed="handleDone"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

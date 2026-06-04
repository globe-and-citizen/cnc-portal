<template>
  <div>
    <p class="text-sm">
      You have created your team, but the necessary smart contracts for its management haven't been
      deployed yet.
      <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
        <UButton size="sm" variant="outline" :disabled="archivedDisabled" @click="open = true">
          Click here
        </UButton>
      </TeamArchivedTooltip>
      to proceed with the deployment.
    </p>
    <UModal
      v-model:open="open"
      title="Deploy Team Contracts"
      description="Complete your team setup by deploying the required contracts."
    >
      <template #body>
        <div class="flex flex-col gap-5">
          <UStepper :model-value="2" :items="stepperItems" disabled class="mb-4 w-full" />
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

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Team } from '@/types'
import InvestorContractStep from './InvestorContractStep.vue'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'

const props = defineProps<{
  team: Team
}>()

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
}
</script>

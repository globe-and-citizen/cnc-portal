<template>
  <UForm :schema="investorSchema" :state="investorContractInput" class="flex flex-col gap-5">
    <UAlert
      v-if="showAlert && team?.name"
      color="success"
      icon="i-heroicons-check-circle"
      :title="`Team &quot;${team.name}&quot; created! To use CNC team features, deploy all your team contracts in one action.`"
      class="mb-2"
    />
    <div class="text-sm text-gray-700 mb-2">
      Start by filling in the required investor contract values below. You can skip this and come back later.
    </div>
    <UFormField label="Share Name" name="name" required help="Full name of the share token (e.g. Company Shares)">
      <UInput
        size="xl"
        v-model="investorContractInput.name"
        placeholder="Company Shares"
        class="w-full"
        data-test="share-name-input"
      />
    </UFormField>
    <UFormField label="Symbol" name="symbol" required help="Short ticker symbol (e.g. SHR, COMP)">
      <UInput
        size="xl"
        v-model="investorContractInput.symbol"
        placeholder="SHR"
        class="w-full"
        data-test="share-symbol-input"
      />
    </UFormField>
    <div class="flex justify-between mt-6">
      <UButton
        v-if="showSkip"
        color="neutral"
        variant="ghost"
        size="xl"
        class="justify-center"
        data-test="skip-button"
        @click="$emit('skip')"
      >
        Skip for now
      </UButton>
      <DeployContractSection
        :disable="!canDeploy"
        :investorContractInput="investorContractInput"
        :createdTeamData="team"
        @contractDeployed="$emit('contractDeployed')"
      >
        Deploy Contracts
      </DeployContractSection>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import type { Team } from '@/types'
import DeployContractSection from './DeployContractSection.vue'

const props = withDefaults(
  defineProps<{
    team: Partial<Team>
    showAlert?: boolean
    showSkip?: boolean
  }>(),
  {
    showAlert: false,
    showSkip: false
  }
)

defineEmits(['skip', 'contractDeployed'])

const investorSchema = z.object({
  name: z.string().min(1, 'Share name is required'),
  symbol: z.string().min(1, 'Symbol is required')
})

const investorContractInput = ref({
  name: '',
  symbol: ''
})

const canDeploy = computed(
  () => !!investorContractInput.value.name && !!investorContractInput.value.symbol
)
</script>

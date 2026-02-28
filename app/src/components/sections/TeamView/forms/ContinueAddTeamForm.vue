<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import DeployContractSection from './DeployContractSection.vue'
import type { Team } from '@/types'

defineEmits(['done'])
const investorContractInput = ref({
  name: '',
  symbol: ''
})
const props = defineProps<{
  team: Partial<Team>
}>()

const investorContractSchema = z.object({
  name: z
    .string({ message: 'Share name is required' })
    .min(4, 'Share name must be at least 4 characters'),
  symbol: z
    .string({ message: 'Symbol is required' })
    .min(3, 'Symbol must be at least 3 characters')
})

const isInvalid = computed(
  () => !investorContractSchema.safeParse(investorContractInput.value).success
)
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Step Indicator -->
    <div class="steps w-full mb-4">
      <a class="step step-primary">Team Details</a>
      <a class="step step-primary">Members</a>
      <a class="step step-primary">Investor Contract</a>
    </div>

    <!-- Step 3: Investor Contract -->
    <div data-test="step-3">
      <span class="font-bold text-2xl mb-4">Investor Contract Details</span>
      <hr class="mb-6" />
      <UForm :schema="investorContractSchema" :state="investorContractInput" class="flex flex-col gap-5">
        <UFormField label="Share Name" name="name" required class="w-full">
          <UInput
            v-model="investorContractInput.name"
            type="text"
            placeholder="Company Shares"
            data-test="share-name-input"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Symbol" name="symbol" required class="w-full">
          <UInput
            v-model="investorContractInput.symbol"
            type="text"
            placeholder="SHR"
            data-test="share-symbol-input"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </div>

    <!-- Navigation Buttons -->
    <div class="flex justify-between mt-6">
      <DeployContractSection
        :disable="isInvalid"
        :investorContractInput="investorContractInput"
        :createdTeamData="props.team"
        @contractDeployed="$emit('done')"
      >
        Deploy Contracts
      </DeployContractSection>
    </div>
  </div>
</template>

<template>
  <div class="flex flex-col gap-5">
    <!-- Step Indicator -->
    <div class="flex items-center w-full mb-4">
      <div class="flex flex-col items-center">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
          :class="currentStep > 1 ? 'bg-primary text-white' : 'bg-primary text-white ring-2 ring-primary ring-offset-2'"
        >
          <UIcon v-if="currentStep > 1" name="i-heroicons-check" class="w-4 h-4" />
          <span v-else>1</span>
        </div>
        <span class="text-xs mt-1 text-center">Team Details</span>
      </div>
      <div class="flex-1 h-0.5 mx-2" :class="currentStep > 1 ? 'bg-primary' : 'bg-gray-200'" />
      <div class="flex flex-col items-center">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
          :class="currentStep > 2 ? 'bg-primary text-white' : currentStep === 2 ? 'bg-primary text-white ring-2 ring-primary ring-offset-2' : 'bg-gray-200 text-gray-500'"
        >
          <UIcon v-if="currentStep > 2" name="i-heroicons-check" class="w-4 h-4" />
          <span v-else>2</span>
        </div>
        <span class="text-xs mt-1 text-center">{{ step2Label }}</span>
      </div>
      <div class="flex-1 h-0.5 mx-2" :class="currentStep > 2 ? 'bg-primary' : 'bg-gray-200'" />
      <div class="flex flex-col items-center">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
          :class="currentStep === 3 ? 'bg-primary text-white ring-2 ring-primary ring-offset-2' : 'bg-gray-200 text-gray-500'"
        >
          <span>3</span>
        </div>
        <span class="text-xs mt-1 text-center">Investor Contract</span>
      </div>
    </div>

    <!-- Step 1: Team Details -->
    <UForm
      v-if="currentStep === 1"
      :schema="teamSchema"
      :state="teamData"
      class="flex flex-col gap-4"
      data-test="step-1"
      @submit="nextStep"
    >
      <UFormField label="Team Name" name="name" required help="Give your team a unique, recognizable name">
        <UInput
          v-model="teamData.name"
          placeholder="Engineering Team"
          class="w-full"
          data-test="team-name-input"
        />
      </UFormField>
      <UFormField label="Description" name="description" help="Optional — briefly describe your team's purpose" :hint="`${teamData.description.length} / 200`">
        <UTextarea
          v-model="teamData.description"
          placeholder="Enter a short description"
          class="w-full"
          :rows="3"
          data-test="team-description-input"
        />
      </UFormField>
      <div class="flex justify-end mt-6">
        <UButton type="submit" class="w-32" data-test="next-button">
          Next
        </UButton>
      </div>
    </UForm>

    <!-- Step 2: Members -->
    <div v-else-if="currentStep === 2" data-test="step-2">
      <div class="flex flex-col gap-5">
        <div class="text-sm text-gray-700 mb-2">
          Invite members to your team. You can always add more later.
        </div>
        <MultiSelectMemberInput v-model="teamData.members" :disable-team-members="false" />
        <div
          class="pl-4 pt-4 text-sm text-red-500"
          data-test="create-team-error"
          v-if="createTeamError"
        >
          Unable to create team
        </div>
      </div>
      <div class="flex justify-between mt-6">
        <UButton
          color="neutral"
          variant="outline"
          class="w-32"
          :disabled="createTeamFetching"
          data-test="previous-button"
          @click="currentStep--"
        >
          Previous
        </UButton>
        <UButton
          class="w-44"
          :loading="createTeamFetching"
          :disabled="createTeamFetching || !canProceed"
          data-test="create-team-button"
          @click="saveTeamToDatabase"
        >
          Create Team
        </UButton>
      </div>
    </div>

    <!-- Step 3: Investor Contract -->
    <UForm
      v-else-if="currentStep === 3"
      :schema="investorSchema"
      :state="investorContractInput"
      class="flex flex-col gap-5"
      data-test="step-3"
    >
      <UAlert
        v-if="createdTeamData"
        color="success"
        icon="i-heroicons-check-circle"
        :title="`Team &quot;${createdTeamData.name}&quot; created! Now optionally deploy an investor contract.`"
        class="mb-2"
      />
      <div class="text-sm text-gray-700 mb-2">
        Optionally deploy an investor contract to issue shares for your team.
      </div>
      <UFormField label="Share Name" name="name" required help="Full name of the share token (e.g. Company Shares)">
        <UInput
          v-model="investorContractInput.name"
          placeholder="Company Shares"
          class="w-full"
          data-test="share-name-input"
        />
      </UFormField>
      <UFormField label="Symbol" name="symbol" required help="Short ticker symbol (e.g. SHR, COMP)">
        <UInput
          v-model="investorContractInput.symbol"
          placeholder="SHR"
          class="w-full"
          data-test="share-symbol-input"
        />
      </UFormField>
      <div class="flex justify-between mt-6">
        <UButton
          color="neutral"
          variant="ghost"
          data-test="skip-button"
          @click="$emit('done')"
        >
          Skip for now
        </UButton>
        <DeployContractSection
          v-if="createdTeamData !== null && createdTeamData"
          :disable="!canProceed"
          :investorContractInput="investorContractInput"
          :createdTeamData="createdTeamData"
          @contractDeployed="navigateToTeam"
        >
          Deploy Contracts
        </DeployContractSection>
      </div>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import { isAddress } from 'viem'
import { log } from '@/utils'
import DeployContractSection from '@/components/sections/TeamView/forms/DeployContractSection.vue'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'
import type { Team } from '@/types'
import { useCreateTeamMutation } from '@/queries/team.queries'
import { useRouter } from 'vue-router'

defineEmits(['done'])
const toast = useToast()
const router = useRouter()
const {
  isPending: createTeamFetching,
  error: createTeamError,
  mutateAsync: executeCreateTeam,
  data: createdTeamData
} = useCreateTeamMutation()

// Zod Schemas
const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional()
})

const investorSchema = z.object({
  name: z.string().min(1, 'Share name is required'),
  symbol: z.string().min(1, 'Symbol is required')
})

// Refs
const teamData = ref<Pick<Team, 'name' | 'description' | 'members'>>({
  name: '',
  description: '',
  members: []
})

const investorContractInput = ref({
  name: '',
  symbol: ''
})

const currentStep = ref(1)

// Computed Properties
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return !!teamData.value.name
    case 2:
      return (
        teamData.value.members.length === 0 ||
        teamData.value.members.every((member) => isAddress(member.address))
      )
    case 3:
      return !!investorContractInput.value.name && !!investorContractInput.value.symbol
    default:
      return false
  }
})

const step2Label = computed(() => {
  if (currentStep.value === 3 && teamData.value.members.length > 0) {
    return `Members (${teamData.value.members.length})`
  }
  return 'Members'
})

// Navigation Functions
const navigateToTeam = () => {
  if (createdTeamData.value?.id) {
    router.push(`/teams/${createdTeamData.value.id}`)
  }
}

const nextStep = () => {
  if (currentStep.value < 4 && canProceed.value) {
    currentStep.value++
  }
}

// Form Submission Functions
const saveTeamToDatabase = async () => {
  const result = teamSchema.safeParse(teamData.value)
  if (!result.success) return
  if (!canProceed.value) return
  await executeCreateTeam({ body: teamData.value })
  if (createTeamError.value) {
    toast.add({ title: 'Failed to create team', color: 'error' })
    log.error('Failed to create team', createTeamError.value)
    return
  }
  toast.add({ title: 'Team created successfully', color: 'success' })
  nextStep()
}
</script>

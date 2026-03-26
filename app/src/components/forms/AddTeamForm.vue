<template>
  <div class="flex flex-col gap-5">
    <!-- Step Indicator -->
    <UStepper v-model="currentStep" :items="stepperItems" disabled class="w-full mb-4" />

    <!-- Step 1: Team Details -->
    <UForm
      v-if="currentStep === 0"
      :schema="teamSchema"
      :state="teamData"
      class="flex flex-col gap-4"
      data-test="step-1"
      @submit="nextStep"
    >
      <UFormField
        label="Team Name"
        name="name"
        required
        help="Give your team a unique, recognizable name"
      >
        <UInput
          
          v-model="teamData.name"
          placeholder="Engineering Team"
          class="w-full"
          data-test="team-name-input"
        />
      </UFormField>
      <UFormField
        label="Description"
        name="description"
        help="Optional — briefly describe your team's purpose"
        :hint="`${teamData.description.length} / 200`"
      >
        <UTextarea
          
          v-model="teamData.description"
          placeholder="Enter a short description"
          class="w-full"
          :rows="3"
          data-test="team-description-input"
        />
      </UFormField>
      <div class="flex justify-end mt-6">
        <UButton type="submit"  class="w-32 justify-center" data-test="next-button">
          Next
        </UButton>
      </div>
    </UForm>

    <!-- Step 2: Members -->
    <div v-else-if="currentStep === 1" data-test="step-2">
      <div class="flex flex-col gap-5">
        <div class="text-sm text-gray-700 mb-2">
          Invite members to your team. You can always add more later.
        </div>
        <MultiSelectMemberInput v-model="teamData.members" :disable-team-members="false" />
        {{ createTeamError }}
        <UAlert
          v-if="createTeamError"
          color="error"
          icon="i-heroicons-exclamation-circle"
          title="Failed to create team"
          description="Something went wrong on our end. Please check your connection and try again."
          data-test="create-team-error"
        />
      </div>
      <div class="flex justify-between mt-6">
        <UButton
          color="neutral"
          variant="outline"
          
          class="w-32 justify-center"
          :disabled="createTeamFetching"
          data-test="previous-button"
          @click="currentStep--"
        >
          Previous
        </UButton>
        <UButton
          
          class="w-44 justify-center"
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
    <div v-else-if="currentStep === 2" data-test="step-3">
      <InvestorContractStep
        v-if="createdTeamData"
        :team="createdTeamData"
        :show-alert="true"
        :show-skip="true"
        @skip="$emit('done')"
        @contractDeployed="navigateToTeam"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import { isAddress } from 'viem'
import { log } from '@/utils'
import InvestorContractStep from '@/components/sections/TeamView/forms/InvestorContractStep.vue'
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

// Refs
const teamData = ref<Pick<Team, 'name' | 'description' | 'members'>>({
  name: '',
  description: '',
  members: []
})

const currentStep = ref(0)

// Computed Properties
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0:
      return !!teamData.value.name
    case 1:
      return (
        teamData.value.members.length === 0 ||
        teamData.value.members.every((member) => isAddress(member.address))
      )
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

const stepperItems = computed(() => [
  { title: 'Team Details', value: 1 },
  { title: step2Label.value, value: 2 },
  { title: 'Investor Contract', value: 3 }
])

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
    log.error('Failed to create team', createTeamError.value)
    return
  }
  toast.add({ title: 'Team created successfully', color: 'success' })
  nextStep()
}
</script>

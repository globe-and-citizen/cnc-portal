<template>
  <div class="flex flex-col gap-5">
    <!-- Step Indicator -->
    <UStepper v-model="currentStep" :items="stepperItems" disabled class="mb-4 w-full" />

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
        label="Company Name"
        name="name"
        required
        help="Give your company a recognizable name"
      >
        <UInput
          v-model="teamData.name"
          placeholder="Acme Corp"
          class="w-full"
          data-test="team-name-input"
        />
      </UFormField>
      <UFormField
        label="Description"
        name="description"
        help="Optional — briefly describe your company's purpose"
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
      <div class="mt-6 flex justify-end">
        <UButton type="submit" class="w-32 justify-center" data-test="next-button"> Next </UButton>
      </div>
    </UForm>

    <!-- Step 2: Members -->
    <div v-else-if="currentStep === 1" data-test="step-2">
      <div class="flex flex-col gap-5">
        <div class="mb-2 text-sm text-gray-700">
          Invite members to your company. You can always add more later.
        </div>
        <MultiSelectMemberInput v-model="teamData.members" />
        {{ createTeamError }}
        <UAlert
          v-if="createTeamError"
          color="error"
          icon="i-heroicons-exclamation-circle"
          title="Failed to create company"
          description="Something went wrong on our end. Please check your connection and try again."
          data-test="create-team-error"
        />
      </div>
      <div class="mt-6 flex justify-between">
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
          Create Company
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
        @skip="showSafeDeploymentStep"
        @contractDeployed="showSafeDeploymentStep"
      />
    </div>

    <!-- Step 4: Safe Wallet -->
    <div v-else-if="currentStep === 3" data-test="step-4">
      <div class="mb-6">
        <h2 class="text-lg font-semibold">Set up your Safe wallet</h2>
        <p class="mt-1 text-sm text-gray-500">
          Connect a new or existing team wallet, or set it up later from the Safe account.
        </p>
      </div>

      <UTabs
        v-model="safeSetupChoice"
        :items="safeSetupTabs"
        aria-label="Safe wallet setup options"
      >
        <template #default="{ item }">
          <span :data-test="`safe-setup-tab-${item.value}`">{{ item.label }}</span>
        </template>
        <template #deploy>
          <SafeDeploymentCard
            v-if="createdTeamData"
            :team-id="Number(createdTeamData.id)"
            :team-owner-address="createdTeamData.ownerAddress"
            @safe-deployed="navigateToTeam"
          />
        </template>
        <template #import>
          <SafeImportCard
            v-if="createdTeamData"
            :team-id="Number(createdTeamData.id)"
            :team-owner-address="createdTeamData.ownerAddress"
            @safe-imported="navigateToTeam"
          />
        </template>
      </UTabs>

      <div class="mt-6 flex justify-end">
        <UButton
          color="neutral"
          variant="ghost"
          data-test="skip-safe-setup-button"
          @click="navigateToTeam"
        >
          Set up Safe later
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import { isAddress } from 'viem'
import { log } from '@/lib/logging'
import InvestorContractStep from '@/components/sections/TeamView/forms/InvestorContractStep.vue'
import SafeDeploymentCard from '@/components/sections/SafeView/SafeDeploymentCard.vue'
import SafeImportCard from '@/components/sections/SafeView/SafeImportCard.vue'
import MultiSelectMemberInput from '@/components/ui/inputs/MultiSelectMemberInput.vue'
import type { Team } from '@/types'
import { useCreateTeamMutation } from '@/queries/team.queries'
import { useRouter } from 'vue-router'

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
  name: z.string().min(1, 'Company name is required'),
  description: z.string().optional()
})

// Refs
const teamData = ref<Pick<Team, 'name' | 'description' | 'members'>>({
  name: '',
  description: '',
  members: []
})

const currentStep = ref(0)
const safeSetupChoice = ref<'deploy' | 'import'>('deploy')
const safeSetupTabs = [
  { label: 'Deploy a new Safe', value: 'deploy', slot: 'deploy' },
  { label: 'Import an existing Safe', value: 'import', slot: 'import' }
]

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
  { title: 'Company Details', value: 1 },
  { title: step2Label.value, value: 2 },
  { title: 'Investor Contract', value: 3 },
  { title: 'Safe Wallet', value: 4 }
])

// Navigation Functions
const navigateToTeam = () => {
  if (createdTeamData.value?.id) {
    router.push(`/teams/${createdTeamData.value.id}`)
  }
}

const nextStep = () => {
  if (currentStep.value < 2 && canProceed.value) {
    currentStep.value++
  }
}

const showSafeDeploymentStep = () => {
  currentStep.value = 3
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
  toast.add({ title: 'Company created successfully', color: 'success' })
  nextStep()
}
</script>

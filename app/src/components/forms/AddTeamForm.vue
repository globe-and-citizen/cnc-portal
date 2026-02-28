<template>
  <div class="flex flex-col gap-5">
    <!-- Step Indicator -->
    <div class="steps w-full mb-4">
      <a class="step" :class="{ 'step-primary': currentStep >= 1 }">Team Details</a>
      <a class="step" :class="{ 'step-primary': currentStep >= 2 }">Members</a>
      <a class="step" :class="{ 'step-primary': currentStep >= 3 }">Investor Contract</a>
    </div>

    <!-- Step 1: Team Details -->
    <div v-if="currentStep === 1" data-test="step-1">
      <span class="font-bold text-2xl mb-4">Team Details</span>
      <hr class="mb-6" />
      <div class="flex flex-col gap-5">
        <UFormField label="Team Name" name="name" required class="w-full mt-4">
          <UInput
            v-model="teamData.name"
            type="text"
            placeholder="Daisy"
            data-test="team-name-input"
            class="w-full"
          />
          <div
            class="pl-4 text-red-500 text-sm"
            v-if="teamNameError"
            data-test="name-error"
          >
            {{ teamNameError }}
          </div>
        </UFormField>
        <UFormField label="Description" name="description" class="w-full">
          <UInput
            v-model="teamData.description"
            type="text"
            placeholder="Enter a short description"
            data-test="team-description-input"
            class="w-full"
          />
        </UFormField>
      </div>
    </div>

    <!-- Step 2: Members -->
    <div v-if="currentStep === 2" data-test="step-2">
      <span class="font-bold text-2xl mb-4">Team Members (Optional)</span>
      <hr class="mb-6" />

      <div class="flex flex-col gap-5">
        <div class="text-sm text-gray-700 mb-2">
          You can add team members now or invite them later.
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
    </div>

    <!-- Step 3: Investor Contract -->
    <div v-if="currentStep === 3" data-test="step-3">
      <span class="font-bold text-2xl mb-4">Investor Contract Details</span>
      <hr class="mb-6" />
      <div class="flex flex-col gap-5">
        <UFormField label="Share Name" name="shareName" required class="w-full">
          <UInput
            v-model="investorContractInput.name"
            type="text"
            placeholder="Company Shares"
            data-test="share-name-input"
            class="w-full"
          />
          <div
            class="pl-4 text-red-500 text-sm"
            v-if="shareNameError"
            data-test="share-name-error"
          >
            {{ shareNameError }}
          </div>
        </UFormField>

        <UFormField label="Symbol" name="shareSymbol" required class="w-full">
          <UInput
            v-model="investorContractInput.symbol"
            type="text"
            placeholder="SHR"
            data-test="share-symbol-input"
            class="w-full"
          />
          <div
            class="pl-4 text-red-500 text-sm"
            v-if="shareSymbolError"
            data-test="share-symbol-error"
          >
            {{ shareSymbolError }}
          </div>
        </UFormField>
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div class="flex justify-between mt-6">
      <UButton
        v-if="currentStep == 2"
        color="neutral"
        variant="outline"
        class="w-32"
        @click="currentStep--"
        :disabled="createTeamFetching || false"
        data-test="previous-button"
      >
        Previous
      </UButton>
      <div class="grow"></div>
      <UButton
        v-if="currentStep === 1"
        color="primary"
        class="w-32"
        data-test="next-button"
        @click="nextStep"
        :disabled="!canProceed"
      >
        Next
      </UButton>
      <UButton
        v-else-if="currentStep === 2"
        color="primary"
        class="w-44"
        :loading="createTeamFetching"
        :disabled="createTeamFetching || !canProceed"
        data-test="create-team-button"
        @click="saveTeamToDatabase"
      >
        Create Team
      </UButton>
      <DeployContractSection
        v-else-if="currentStep === 3 && createdTeamData !== null && createdTeamData"
        :disable="!canProceed"
        :investorContractInput="investorContractInput"
        :createdTeamData="createdTeamData"
        @contractDeployed="
          () => {
            $emit('done')
          }
        "
      >
        Deploy Contracts
      </DeployContractSection>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { z } from 'zod'
import { isAddress } from 'viem'
import { log } from '@/utils'
import DeployContractSection from '@/components/sections/TeamView/forms/DeployContractSection.vue'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'
import { onClickOutside } from '@vueuse/core'
import type { Team } from '@/types'
import { useToastStore } from '@/stores/useToastStore'
import { useCreateTeamMutation } from '@/queries/team.queries'

defineEmits(['done'])
const { addSuccessToast, addErrorToast } = useToastStore()
const {
  isPending: createTeamFetching,
  error: createTeamError,
  mutateAsync: executeCreateTeam,
  data: createdTeamData
} = useCreateTeamMutation()

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

const showDropdown = ref(false)
const formRef = ref<HTMLElement | null>(null)
const currentStep = ref(1)
const touched = ref(false)

// Zod Schemas
const teamDataSchema = z.object({
  name: z.string({ message: 'Team name is required' }).min(1, 'Team name is required'),
  description: z.string().optional(),
  members: z.array(
    z.object({
      address: z.string().refine((val) => isAddress(val), { message: 'Invalid Ethereum address' }),
      name: z.string().optional()
    })
  )
})

const investorContractSchema = z.object({
  name: z.string({ message: 'Share name is required' }).min(1, 'Share name is required'),
  symbol: z.string({ message: 'Symbol is required' }).min(1, 'Symbol is required')
})

// Computed validation errors (shown only after touch)
const teamNameError = computed(() => {
  if (!touched.value) return ''
  const result = teamDataSchema.shape.name.safeParse(teamData.value.name)
  return result.success ? '' : result.error.issues[0]?.message ?? ''
})

const shareNameError = computed(() => {
  if (!touched.value) return ''
  const result = investorContractSchema.shape.name.safeParse(investorContractInput.value.name)
  return result.success ? '' : result.error.issues[0]?.message ?? ''
})

const shareSymbolError = computed(() => {
  if (!touched.value) return ''
  const result = investorContractSchema.shape.symbol.safeParse(investorContractInput.value.symbol)
  return result.success ? '' : result.error.issues[0]?.message ?? ''
})

// Computed Properties
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return teamDataSchema.shape.name.safeParse(teamData.value.name).success
    case 2:
      // Members are optional, so always allow proceeding from step 2
      return (
        teamData.value.members.length === 0 ||
        teamData.value.members.every((member) => isAddress(member.address))
      )
    case 3:
      return investorContractSchema.safeParse(investorContractInput.value).success
    default:
      return false
  }
})

// Navigation Functions
const nextStep = () => {
  if (currentStep.value < 4 && canProceed.value) {
    currentStep.value++
  }
}

// Form Submission Functions
const saveTeamToDatabase = async () => {
  touched.value = true
  const result = teamDataSchema.safeParse(teamData.value)
  if (!result.success) return
  await executeCreateTeam({ body: teamData.value })
  if (createTeamError.value) {
    addErrorToast('Failed to create team')
    log.error('Failed to create team', createTeamError.value)
    return
  }
  addSuccessToast('Team created successfully')
  // Move to next step only after successful team creation
  nextStep()
}

// Lifecycle Hooks
onMounted(() => {
  onClickOutside(formRef, () => {
    showDropdown.value = false
  })
})

defineExpose({
  teamDataSchema,
  investorContractSchema,
  touched
})
</script>

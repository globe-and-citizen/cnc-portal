<template>
  <div class="flex flex-col gap-5">
    <!-- Step Indicator -->
    <div class="steps w-full mb-4">
      <a class="step" :class="{ 'step-primary': currentStep >= 1 }">Team Details</a>
      <a class="step" :class="{ 'step-primary': currentStep >= 2 }">Members</a>
      <a class="step" :class="{ 'step-primary': currentStep >= 3 }">Investor Contract</a>
    </div>

    <!-- Step 1: Team Details -->
    <div v-if="currentStep === 1">
      <h1 class="font-bold text-2xl mb-4">Team Details</h1>
      <hr class="mb-6" />
      <div class="flex flex-col gap-5">
        <div>
          <label class="input input-bordered flex items-center gap-2 input-md mt-4">
            <span class="w-24">Team Name</span>
            <input
              type="text"
              class="grow"
              placeholder="Daisy"
              data-test="team-name-input"
              v-model="teamData.name"
              name="name"
            />
          </label>
          <div
            class="pl-4 text-red-500 text-sm"
            v-for="error of $v.teamData.name.$errors"
            data-test="name-error"
            :key="error.$uid"
          >
            {{ error.$message }}
          </div>
        </div>
        <label class="input input-bordered flex items-center gap-2 input-md">
          <span class="w-24">Description</span>
          <input
            type="text"
            class="grow"
            placeholder="Enter a short description"
            data-test="team-description-input"
            v-model="teamData.description"
            name="description"
          />
        </label>
      </div>
    </div>

    <!-- Step 2: Members -->
    <div v-if="currentStep === 2">
      <h1 class="font-bold text-2xl mb-4">Team Members (Optional)</h1>
      <hr class="mb-6" />
      <div class="flex flex-col gap-5">
        <div class="text-sm text-gray-600 mb-2">
          You can add team members now or invite them later.
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex items-center" v-for="(member, index) of teamData.members">
            <UserComponent
              class="bg-base-200 p-4 flex-grow"
              :user="{ name: member.name, address: member.address }"
            />
            <div>
              <ButtonUI variant="error" class="mt-4" size="sm" @click="removeMember(index)">
                -
              </ButtonUI>
            </div>
          </div>
        </div>
        <div class="input-group relative" ref="formRef">
          <label
            class="input input-bordered flex items-center gap-2 input-md"
            :data-test="`member-input`"
          >
            <input
              type="text"
              class="w-24"
              v-model="input.name"
              @keyup.stop="searchUsers({ name: input.name, address: '' })"
              :placeholder="'Member Name '"
              :data-test="`member-name-input`"
            />
            |
            <input
              type="text"
              class="grow"
              v-model="input.address"
              @keyup.stop="searchUsers({ name: '', address: input.address })"
              :data-test="`member-address-input`"
              :placeholder="`Member Address`"
            />
          </label>
          <!-- Dropdown positioned relative to the input -->
          <div
            v-if="showDropdown && users.users && users.users.length > 0"
            class="absolute left-0 top-full mt-1 w-full z-10"
          >
            <ul class="p-2 shadow menu dropdown-content bg-base-100 rounded-box w-full">
              <li v-for="user in users.users" :key="user.address">
                <a
                  :data-test="`user-dropdown-${user.address}`"
                  @click="
                    () => {
                      addMember(user)
                      showDropdown = false
                    }
                  "
                >
                  {{ user.name }} | {{ user.address }}
                </a>
              </li>
            </ul>
          </div>
          <div
            class="pl-4 pt-4 text-sm text-red-500"
            data-test="create-team-error"
            v-if="createTeamError"
          >
            Unable too create team
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: Investor Contract -->
    <div v-if="currentStep === 3">
      <h1 class="font-bold text-2xl mb-4">Investor Contract Details</h1>
      <hr class="mb-6" />
      <div class="flex flex-col gap-5">
        <label class="input input-bordered flex items-center gap-2 input-md">
          <span class="w-24">Share Name</span>
          <input
            type="text"
            class="grow"
            placeholder="Company Shares"
            data-test="share-name-input"
            v-model="investorContract.name"
            name="shareName"
          />
        </label>
        <div
          class="pl-4 text-red-500 text-sm"
          v-for="error of $vInvestor.investorContract.name.$errors"
          data-test="share-name-error"
          :key="error.$uid"
        >
          {{ error.$message }}
        </div>

        <label class="input input-bordered flex items-center gap-2 input-md">
          <span class="w-24">Symbol</span>
          <input
            type="text"
            class="grow"
            placeholder="SHR"
            data-test="share-symbol-input"
            v-model="investorContract.symbol"
            name="shareSymbol"
          />
        </label>
        <div
          class="pl-4 text-red-500 text-sm"
          v-for="error of $vInvestor.investorContract.symbol.$errors"
          data-test="share-symbol-error"
          :key="error.$uid"
        >
          {{ error.$message }}
        </div>
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div class="flex justify-between mt-6">
      <ButtonUI
        v-if="currentStep > 1"
        variant="secondary"
        class="w-32"
        @click="currentStep--"
        :disabled="createTeamFetching || false"
        data-test="previous-button"
      >
        Previous
      </ButtonUI>
      <div class="flex-grow"></div>
      <ButtonUI
        v-if="currentStep === 1"
        variant="primary"
        class="w-32"
        data-test="next-button"
        @click="nextStep"
        :disabled="!canProceed"
      >
        Next
      </ButtonUI>
      <ButtonUI
        v-else-if="currentStep === 2"
        variant="primary"
        class="w-44"
        :loading="createTeamFetching"
        :disabled="createTeamFetching || !canProceed"
        data-test="create-team-button"
        @click="saveTeamToDatabase"
      >
        Create Team
      </ButtonUI>
      <ButtonUI
        v-else-if="currentStep === 3"
        variant="primary"
        class="w-44"
        :loading="isLoading"
        :disabled="isLoading || !canProceed"
        data-test="deploy-contracts-button"
        @click="deployContracts"
      >
        Deploy Contracts
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import useVuelidate from '@vuelidate/core'
import { required, helpers } from '@vuelidate/validators'
import { isAddress } from 'viem'
import { log } from '@/utils'
import { useCustomFetch } from '@/composables/useCustomFetch'
import UserComponent from '@/components/UserComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { onClickOutside } from '@vueuse/core'
import type { TeamInput, User, Team } from '@/types'
import { useToastStore } from '@/stores/useToastStore'

const { addSuccessToast, addErrorToast } = useToastStore()

const emit = defineEmits(['searchUsers', 'addTeam', 'deployContracts', 'watchEvents'])
const lastUpdatedInput = ref<'name' | 'address'>('name')

// Refs
const teamData = ref<TeamInput>({
  name: '',
  description: '',
  members: []
})

const input = ref({
  name: '',
  address: ''
})

const investorContract = ref({
  name: '',
  symbol: ''
})

const showDropdown = ref(false)
const formRef = ref<HTMLElement | null>(null)
const currentStep = ref(1)

const url = ref('user/search')

const {
  execute: executeSearchUser,
  response: searchUserResponse,
  data: users
} = useCustomFetch(url, { immediate: false }).get().json()
// Team creation API call
const {
  isFetching: createTeamFetching,
  error: createTeamError,
  execute: executeCreateTeam,
  response: createTeamResponse,
  data: createTeamData
} = useCustomFetch('teams', {
  immediate: false
})
  .post(teamData.value)
  .json<Partial<Team>>()

const searchUsers = async (input: { name: string; address: string }) => {
  if (input.address == '' && input.name) {
    url.value = 'user/search?name=' + input.name
  } else if (input.name == '' && input.address) {
    url.value = 'user/search?address=' + input.address
  }

  await executeSearchUser()
  showDropdown.value = true
}

// Validation Rules
const rules = {
  teamData: {
    name: { required },
    members: {
      $each: {
        address: {
          isValidAddress: helpers.withMessage('Invalid Ethereum address', (value: string) =>
            isAddress(value)
          )
        }
      }
    }
  }
}

const investorContractRules = {
  investorContract: {
    name: { required },
    symbol: { required }
  }
}

// Validation Instances
const $v = useVuelidate(rules, { teamData })
const $vInvestor = useVuelidate(investorContractRules, { investorContract })

// Computed Properties
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return !!teamData.value.name
    case 2:
      // Members are optional, so always allow proceeding from step 2
      return (
        teamData.value.members.length === 0 ||
        teamData.value.members.every((member) => !member.address || isAddress(member.address))
      )
    case 3:
      return !!investorContract.value.name && !!investorContract.value.symbol
    default:
      return false
  }
})

// Team Member Functions
const addMember = (member: { name: string; address: string }) => {
  // Check if there is any member with the same address
  if (!teamData.value.members.find((m) => m.address === member.address)) {
    teamData.value.members.push(member)
  }
}

const removeMember = (id: number) => {
  teamData.value.members.splice(id, 1)
}

const getMessages = (index: number) => {
  return $v.value.teamData.members.$errors[0]?.$response.$errors[index]?.address ?? []
}

// Navigation Functions
const nextStep = () => {
  if (currentStep.value < 4 && canProceed.value) {
    currentStep.value++
  }
}

// Form Submission Functions
const saveTeamToDatabase = async () => {
  $v.value.$touch()
  if ($v.value.$invalid) return
  await executeCreateTeam()
  if (createTeamError.value) {
    addErrorToast('Failed to create team')
    log.error('Failed to create team', createTeamError.value)
    return
  }
  addSuccessToast('Team created successfully')
  // Move to next step only after successful team creation
  nextStep()
}

const deployContracts = async () => {
  $vInvestor.value.$touch()
  if ($vInvestor.value.$invalid) return

  emit('deployContracts', {
    investorContract: investorContract.value
  })
}

// Lifecycle Hooks
onMounted(() => {
  onClickOutside(formRef, () => {
    showDropdown.value = false
  })
})
</script>

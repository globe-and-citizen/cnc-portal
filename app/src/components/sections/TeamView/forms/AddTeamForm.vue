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
        <div v-if="teamData.members.length === 0" class="text-center py-4">
          <p class="text-gray-500">No team members added yet</p>
          <ButtonUI
            variant="secondary"
            class="mt-4"
            data-test="add-first-member"
            @click="addMember"
          >
            Add Team Member
          </ButtonUI>
        </div>
        <div
          v-else
          v-for="(input, index) of teamData.members"
          :key="index"
          class="input-group relative"
        >
          <label
            class="input input-bordered flex items-center gap-2 input-md"
            :data-test="`member-${index}-input`"
          >
            <input
              type="text"
              class="w-24"
              v-model="input.name"
              @focus="() => setActiveInput(index)"
              @keyup.stop="searchUsers({ name: input.name, address: input.address })"
              :placeholder="'Member Name ' + (index + 1)"
              :data-test="`member-${index}-name-input`"
            />
            |
            <input
              type="text"
              class="grow"
              v-model="input.address"
              @keyup.stop="searchUsers({ name: input.name, address: input.address })"
              :data-test="`member-${index}-address-input`"
              :placeholder="`Member ${index + 1} Address`"
            />
          </label>
          <!-- Dropdown positioned relative to the input -->
          <div
            v-if="showDropdown && activeInputIndex === index && users && users.length > 0"
            class="absolute left-0 top-full mt-1 w-full z-10"
          >
            <ul class="p-2 shadow menu dropdown-content bg-base-100 rounded-box w-full">
              <li v-for="user in users" :key="user.address">
                <a
                  :data-test="`user-dropdown-${user.address}`"
                  @click="
                    () => {
                      teamData.members[index].name = user.name ?? ''
                      teamData.members[index].address = user.address ?? ''
                      showDropdown = false
                    }
                  "
                >
                  {{ user.name }} | {{ user.address }}
                </a>
              </li>
            </ul>
          </div>
          <div v-if="$v.teamData.members.$errors.length">
            <div
              class="pl-4 text-sm text-red-500"
              v-for="(error, errorIndex) of getMessages(index)"
              data-test="address-error"
              :key="errorIndex"
            >
              {{ error.$message }}
            </div>
          </div>
        </div>
        <div v-if="teamData.members.length > 0" class="flex justify-end pt-3">
          <div class="w-6 h-6 cursor-pointer mr-2" data-test="add-member" @click="addMember">
            <PlusCircleIcon class="size-6" />
          </div>
          <div class="w-6 h-6 cursor-pointer" data-test="remove-member" @click="removeMember">
            <MinusCircleIcon class="size-6" />
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
        :disabled="isLoading"
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
        :disabled="!canProceed || isLoading"
      >
        Next
      </ButtonUI>
      <ButtonUI
        v-else-if="currentStep === 2"
        variant="primary"
        class="w-44"
        :loading="isLoading"
        :disabled="isLoading || !canProceed"
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
import { PlusCircleIcon, MinusCircleIcon } from '@heroicons/vue/24/outline'
import ButtonUI from '@/components/ButtonUI.vue'
import type { TeamInput, User } from '@/types'

// Props & Emits
const props = defineProps<{
  isLoading: boolean
  users: User[]
}>()

const emit = defineEmits(['searchUsers', 'addTeam', 'deployContracts', 'watchEvents'])

// Refs
const teamData = ref<TeamInput>({
  name: '',
  description: '',
  members: []
})

const investorContract = ref({
  name: '',
  symbol: ''
})

const showDropdown = ref(false)
const formRef = ref<HTMLElement | null>(null)
const currentStep = ref(1)
const activeInputIndex = ref<number | null>(null)

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

// Dropdown Functions
const searchUsers = (input: { name: string; address: string }) => {
  if (!props.isLoading) {
    showDropdown.value = true
    emit('searchUsers', input)
  }
}

const setActiveInput = (index: number) => {
  activeInputIndex.value = index
  showDropdown.value = true
}

const handleClickOutside = (event: MouseEvent) => {
  if (formRef.value && !formRef.value.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

// Team Member Functions
const addMember = () => {
  teamData.value.members.push({ name: '', address: '' })
}

const removeMember = () => {
  if (teamData.value.members.length > 0) {
    teamData.value.members.pop()
  }
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

  emit('addTeam', {
    team: teamData.value
  })
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
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

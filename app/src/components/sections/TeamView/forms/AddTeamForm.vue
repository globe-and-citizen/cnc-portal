<template>
  <div class="flex flex-col gap-5">
    <!-- Step Indicator -->
    <div class="steps w-full mb-4">
      <a class="step" :class="{ 'step-primary': currentStep >= 1 }">Team Details</a>
      <a class="step" :class="{ 'step-primary': currentStep >= 2 }">Members</a>
      <a class="step" :class="{ 'step-primary': currentStep >= 3 }">Investor Contract</a>
      <a class="step" :class="{ 'step-primary': currentStep >= 4 }">Deploy Contracts</a>
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
      <h1 class="font-bold text-2xl mb-4">Team Members</h1>
      <hr class="mb-6" />
      <div class="flex flex-col gap-5">
        <div v-for="(input, index) of teamData.members" :key="index" class="input-group relative">
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
        <div class="flex justify-end pt-3">
          <div
            class="w-6 h-6 cursor-pointer mr-2"
            data-test="add-member"
            @click="
              () => {
                teamData.members.push({ name: '', address: '' })
              }
            "
          >
            <PlusCircleIcon class="size-6" />
          </div>
          <div
            class="w-6 h-6 cursor-pointer"
            data-test="remove-member"
            @click="
              () => {
                if (teamData.members.length > 1) {
                  teamData.members.pop()
                }
              }
            "
          >
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

    <!-- Step 4: Deploy Contracts -->
    <div v-if="currentStep === 4">
      <h1 class="font-bold text-2xl mb-4">Deploy Contracts</h1>
      <hr class="mb-6" />
      <div class="flex flex-col gap-5">
        <div class="bg-base-200 p-4 rounded-lg">
          <h3 class="font-bold mb-2">Team Information</h3>
          <p><span class="font-semibold">Name:</span> {{ teamData.name }}</p>
          <p><span class="font-semibold">Description:</span> {{ teamData.description }}</p>
        </div>
        <div class="bg-base-200 p-4 rounded-lg">
          <h3 class="font-bold mb-2">Investor Contract</h3>
          <p><span class="font-semibold">Share Name:</span> {{ investorContract.name }}</p>
          <p><span class="font-semibold">Symbol:</span> {{ investorContract.symbol }}</p>
        </div>
        <div class="bg-base-200 p-4 rounded-lg">
          <h3 class="font-bold mb-2">Team Members</h3>
          <div v-for="(member, index) in teamData.members" :key="index" class="mb-2">
            <p>{{ member.name }} | {{ member.address }}</p>
          </div>
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

const props = defineProps<{
  isLoading: boolean
  users: User[]
}>()

const emit = defineEmits(['searchUsers', 'addTeam', 'deployContracts', 'watchEvents'])

const teamData = ref<TeamInput>({
  name: '',
  description: '',
  members: [{ name: '', address: '' }]
})

const showDropdown = ref(false)
const formRef = ref<HTMLElement | null>(null)
const currentStep = ref(1)

const investorContract = ref({
  name: '',
  symbol: ''
})

const rules = {
  teamData: {
    name: { required },
    members: {
      $each: {
        address: {
          required,
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

// Create separate validation instances
const $v = useVuelidate(rules, { teamData })
const $vInvestor = useVuelidate(investorContractRules, { investorContract })

const searchUsers = (input: { name: string; address: string }) => {
  if (!props.isLoading) {
    showDropdown.value = true
    emit('searchUsers', input)
  }
}

const saveTeamToDatabase = async () => {
  $v.value.$touch()
  if ($v.value.$invalid) return

  emit('addTeam', {
    team: teamData.value
  })
}

const deployContracts = async () => {
  $vInvestor.value.$touch()
  if ($vInvestor.value.$invalid) return

  emit('deployContracts', {
    investorContract: investorContract.value
  })
}

const getMessages = (index: number) => {
  return $v.value.teamData.members.$errors[0].$response.$errors[index].address
}

const activeInputIndex = ref<number | null>(null)

const setActiveInput = (index: number) => {
  activeInputIndex.value = index
  showDropdown.value = true
}

// Computed property to determine if user can proceed to next step
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return !!teamData.value.name
    case 2:
      return teamData.value.members.every((member) => member.name && isAddress(member.address))
    case 3:
      return !!investorContract.value.name && !!investorContract.value.symbol
    case 4:
      return !$vInvestor.value.$invalid
    default:
      return false
  }
})

const nextStep = () => {
  if (currentStep.value < 4 && canProceed.value) {
    currentStep.value++
  }
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (formRef.value && !formRef.value.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

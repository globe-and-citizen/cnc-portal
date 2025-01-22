<template>
  <h1 class="font-bold text-2xl mb-4">Create New Team</h1>
  <hr class="mb-6" />
  <div class="flex flex-col gap-5">
    <!-- Team Details Section -->
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

    <!-- Investor Contract Section -->
    <div class="divider">Investor Contract Details</div>
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
      v-for="error of $v.investorContract.name.$errors"
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
      v-for="error of $v.investorContract.symbol.$errors"
      data-test="share-symbol-error"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>

    <!-- Members Section -->
    <div class="divider">Members</div>
    <div v-for="(input, index) of teamData.members" :key="index" class="input-group">
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
  </div>
  <div
    class="dropdown"
    :class="{ 'dropdown-open': showDropdown && !!users && users.length > 0 }"
    ref="formRef"
  >
    <ul class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-96">
      <li v-for="user in users" :key="user.address">
        <a
          :data-test="`user-dropdown-${user.address}`"
          @click="
            () => {
              const l = teamData.members.length - 1
              if (l >= 0) {
                teamData.members[l].name = user.name ?? ''
                teamData.members[l].address = user.address ?? ''
                showDropdown = false
              }
            }
          "
        >
          {{ user.name }} | {{ user.address }}
        </a>
      </li>
    </ul>
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
  <div class="flex justify-center mt-6">
    <ButtonUI
      :loading="isLoading"
      :disabled="isLoading"
      variant="primary"
      class="w-44 text-center"
      data-test="create-team-button"
      @click="onSubmit"
    >
      Create Team
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
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

const emit = defineEmits(['searchUsers', 'addTeam'])

const teamData = ref<TeamInput>({
  name: '',
  description: '',
  members: [{ name: '', address: '' }]
})

const showDropdown = ref(false)
const formRef = ref<HTMLElement | null>(null)

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
  },
  investorContract: {
    name: { required },
    symbol: { required }
  }
}

const $v = useVuelidate(rules, { teamData, investorContract })

const searchUsers = (input: { name: string; address: string }) => {
  showDropdown.value = true
  emit('searchUsers', input)
}

const onSubmit = async () => {
  $v.value.$touch()
  if ($v.value.$invalid) return

  emit('addTeam', {
    team: teamData.value,
    investorContract: investorContract.value
  })
}
const getMessages = (index: number) => {
  return $v.value.teamData.members.$errors[0].$response.$errors[index].address
}
// Watch for model updates
watch(
  () => props.users,
  (newUsers) => {
    if (newUsers && newUsers.length === 0) {
      showDropdown.value = false
    }
  }
)
const activeInputIndex = ref<number | null>(null)

const setActiveInput = (index: number) => {
  activeInputIndex.value = index
}
</script>

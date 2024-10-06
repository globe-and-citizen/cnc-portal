<template>
  <h1 class="font-bold text-2xl">Create New Team</h1>
  <hr class="" />
  <div class="flex flex-col gap-5">
    <div>
      <label class="input input-bordered flex items-center gap-2 input-md mt-4">
        <span class="w-24">Team Name</span>
        <input type="text" class="grow" placeholder="Daisy" v-model="team.name" name="name" />
      </label>
      <div
        class="pl-4 text-red-500 text-sm"
        v-for="error of $v.team.name.$errors"
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
        v-model="team.description"
        name="description"
      />
    </label>

    <div v-for="(input, index) of team.members" :key="index" class="input-group">
      <label
        class="input input-bordered flex items-center gap-2 input-md"
        :class="{ 'input-error': !isValidMember(index), 'input-success': isValidMember(index) }"
      >
        <input
          type="text"
          class="w-24"
          v-model="input.name"
          @keyup.stop="
            () => {
              emits('searchUsers', input)
              dropdown = true
            }
          "
          :placeholder="'Member Name ' + (index + 1)"
        />
        |
        <input
          type="text"
          class="grow"
          v-model="input.address"
          @keyup.stop="
            () => {
              emits('searchUsers', input)
              dropdown = true
            }
          "
          :placeholder="'Wallet Address ' + (index + 1)"
        />
      </label>
      <div v-if="$v.team.members.$errors.length">
        <div
          class="pl-4 text-sm text-red-500"
          v-for="(error, errorIndex) of getMessages(index)"
          :key="errorIndex"
        >
          {{ error.$message }}
        </div>
      </div>
    </div>
  </div>
  <div class="dropdown" :class="{ 'dropdown-open': !!users && users.length > 0 }" v-if="dropdown">
    <ul class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-96">
      <li v-for="user in users" :key="user.address">
        <a
          @click="
            () => {
              const l = team.members.length - 1
              if (l >= 0) {
                team.members[l].name = user.name ?? ''
                team.members[l].address = user.address ?? ''
                dropdown = false
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
      class="w-6 h-6 cursor-pointer"
      data-test="add-member"
      @click="
        () => {
          team.members.push({ name: '', address: '' })
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
          if (team.members.length > 1) {
            team.members.pop()
          }
        }
      "
    >
      <MinusCircleIcon class="size-6" />
    </div>
  </div>

  <div class="modal-action justify-center">
    <!-- if there is a button in form, it will close the modal -->
    <LoadingButton v-if="isLoading" color="primary min-w-24" />
    <button class="btn btn-primary" data-test="submit" @click="submitForm" v-else>Submit</button>

    <!-- <button class="btn" @click="showModal = !showModal">Close</button> -->
  </div>
</template>
<script setup lang="ts">
import type { User } from '@/types'
import { ref } from 'vue'
import { PlusCircleIcon, MinusCircleIcon } from '@heroicons/vue/24/outline'
import LoadingButton from '@/components/LoadingButton.vue'
import { isAddress } from 'ethers'
import { helpers, required } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

// TODO: Type the team
const team = defineModel({
  default: {
    name: '',
    description: '',
    members: [{ name: '', address: '' }]
  }
})

const rules = {
  team: {
    name: { required },
    members: {
      $each: helpers.forEach({
        address: {
          required,
          isValid: helpers.withMessage('Invalid address', (value: string) => {
            return isAddress(value)
          })
        }
      })
    }
  }
}
const $v = useVuelidate(rules, { team })

// Check if the member input is valid
const isValidMember = (index: number) => {
  return $v.value.team.members.$errors[0]?.$response.$errors[index].address.length == 0
}


const submitForm = () => {
  // Touch to check validation
  $v.value.$touch()

  // Checking the actual validation state
  if ($v.value.$invalid) {
    return
  }
  emits('addTeam')
}

const getMessages = (index: number) => {
  return $v.value.team.members.$errors[0].$response.$errors[index].address
}

const emits = defineEmits(['addTeam', 'searchUsers'])

defineProps<{
  users: User[]
  isLoading: boolean
}>()

const dropdown = ref<boolean>(true)
</script>

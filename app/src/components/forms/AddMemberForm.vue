<template>
  <h1 class="font-bold text-2xl">Add New Member</h1>
  <hr class="" />
  <div v-for="(input, index) in formData" :key="index" class="input-group mt-3">
    <label
      class="input input-bordered flex items-center gap-2 input-md"
      :class="{ 'input-error': !input.isValid }"
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
        @input="() => (isAddress(input.address) ? (input.isValid = true) : (input.isValid = false))"
        @keyup.stop="
          () => {
            emits('searchUsers', input)
            dropdown = true
          }
        "
        :placeholder="'Wallet Address ' + (index + 1)"
      />
      <span class="badge badge-primary">Mandatory</span>
    </label>
  </div>
  <div class="dropdown" :class="{ 'dropdown-open': !!users && users.length > 0 }" v-if="dropdown">
    <ul class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-96">
      <li v-for="user in users" :key="user.address">
        <a
          @click="
            () => {
              const l = formData.length - 1
              if (l >= 0) {
                formData[l].name = user.name ?? ''
                formData[l].address = user.address ?? ''
                if (isAddress(formData[l].address)) {
                  formData[l].isValid = true
                } else {
                  formData[l].isValid = false
                }
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
      @click="
        () => {
          formData.push({ name: '', address: '', isValid: false })
        }
      "
      data-test="plus-icon"
    >
      <PlusCircleIcon class="size-6 text-green-700" />
    </div>
    <div
      class="w-6 h-6 cursor-pointer"
      @click="
        () => {
          if (formData.length > 1) {
            formData.pop()
          }
        }
      "
      data-test="minus-icon"
    >
      <MinusCircleIcon class="size-6 text-red-700" />
    </div>
  </div>
  <div class="flex justify-center">
    <LoadingButton color=" primary w-24" v-if="isLoading" class="btn btn-primary justify-center" />
    <button class="btn btn-primary justify-center" v-else @click="emits('addMembers')">Add</button>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import type { User } from '@/types'
// import { PlusCircleIcon, MinusCircleIcon } from '@heroicons/vue/24/outline'
import { PlusCircleIcon, MinusCircleIcon } from '@heroicons/vue/24/solid'
import LoadingButton from '../LoadingButton.vue'
import { isAddress } from 'ethers'
const emits = defineEmits(['updateForm', 'addMembers', 'searchUsers'])
const props = defineProps<{
  formData: Array<{ name: string; address: string; isValid: boolean }>
  users: User[]
  isLoading: boolean
}>()
const dropdown = ref<boolean>(true)

const formData = ref(props.formData)
</script>

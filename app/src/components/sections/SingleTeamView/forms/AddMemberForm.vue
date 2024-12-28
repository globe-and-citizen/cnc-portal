<template>
  <h1 class="font-bold text-2xl">Add New Member</h1>
  <hr />
  <div ref="formRef">
    <div v-for="(input, index) in formData" :key="index" class="input-group mt-3">
      <label class="input input-bordered flex items-center gap-2 input-md">
        <input
          type="text"
          class="w-24"
          v-model="input.name"
          @keyup.stop="
            () => {
              emits('searchUsers', input)
              showDropdown = true
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
              showDropdown = true
            }
          "
          :placeholder="'Wallet Address ' + (index + 1)"
        />
        <span class="badge badge-primary">Mandatory</span>
      </label>
    </div>

    <div
      class="dropdown"
      :class="{ 'dropdown-open': !!users && users.length > 0 }"
      v-if="showDropdown"
    >
      <ul class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-96">
        <li v-for="user in users" :key="user.address">
          <a
            @click="
              () => {
                const l = formData.length - 1
                if (l >= 0) {
                  formData[l].name = user.name ?? ''
                  formData[l].address = user.address ?? ''
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
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.formData.$errors"
      :key="error.$uid"
    >
      <div v-if="Array.isArray(error.$message)">
        <div v-for="(errorObj, index) of error.$message" :key="index">
          <div v-for="(error, index1) of errorObj" :key="index1">
            {{ error }}
          </div>
        </div>
      </div>
      <div v-else>
        {{ error.$message }}
      </div>
    </div>
    <div class="flex justify-end pt-3">
      <div
        class="w-6 h-6 cursor-pointer"
        @click="() => formData.push({ name: '', address: '' })"
        data-test="plus-icon"
      >
        <PlusCircleIcon class="size-6 text-green-700" />
      </div>
      <div
        class="w-6 h-6 cursor-pointer"
        @click="() => formData.length > 1 && formData.pop()"
        data-test="minus-icon"
      >
        <MinusCircleIcon class="size-6 text-red-700" />
      </div>
    </div>
    <div class="flex justify-center">
      <ButtonUI
        variant="primary"
        class="justify-center"
        :loading="isLoading"
        :disabled="isLoading"
        @click="submitForm"
        >Add</ButtonUI
      >
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, helpers } from '@vuelidate/validators'
import type { User } from '@/types'
import { PlusCircleIcon, MinusCircleIcon } from '@heroicons/vue/24/solid'
import { isAddress } from 'ethers'
import ButtonUI from '@/components/ButtonUI.vue'

const emits = defineEmits(['updateForm', 'addMembers', 'searchUsers'])

const props = defineProps<{
  formData: Array<{ name: string; address: string }>
  users: User[]
  isLoading: boolean
}>()

const formData = ref(props.formData)
const formRef = ref<HTMLElement | null>(null)
const showDropdown = ref<boolean>(false)

const rules = {
  formData: {
    $each: helpers.forEach({
      address: {
        required: helpers.withMessage('Address is required', required),
        $valid: helpers.withMessage('Invalid wallet address', (value: string) => isAddress(value))
      }
    }),

    $valid: helpers.withMessage(
      'At least one member is required',
      (value: Array<{ name: string; address: string }>) => {
        return value.some((v) => v.address)
      }
    )
  }
}

const $v = useVuelidate(rules, { formData })

const submitForm = () => {
  $v.value.$touch()
  if ($v.value.$invalid) return
  emits('addMembers', formData.value)
}
</script>

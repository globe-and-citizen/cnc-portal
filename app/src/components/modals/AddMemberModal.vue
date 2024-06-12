<template>
  <dialog
    id="my_modal_10"
    class="modal modal-bottom sm:modal-middle"
    :class="{ 'modal-open': showAddMemberForm }"
  >
    <div class="modal-box">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="emits('toggleAddMemberModal')"
      >
        ✕
      </button>
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
      <div
        class="dropdown"
        :class="{ 'dropdown-open': !!users && users.length > 0 }"
        v-if="dropdown"
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
        <div class="w-6 h-6 cursor-pointer" @click="emits('addInput')">
          <IconPlus />
        </div>
        <div class="w-6 h-6 cursor-pointer" @click="emits('removeInput')">
          <IconMinus />
        </div>
      </div>
      <div class="flex justify-center" @click="emits('addMembers')">
        <button class="btn btn-primary justify-center">Add</button>
      </div>
    </div>
  </dialog>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import type { User } from '@/types'
import IconPlus from '@/components/icons/IconPlus.vue'
import IconMinus from '@/components/icons/IconMinus.vue'
const emits = defineEmits([
  'updateForm',
  'addInput',
  'removeInput',
  'addMembers',
  'toggleAddMemberModal',
  'searchUsers'
])
const props = defineProps<{
  formData: Array<{ name: string; address: string; isValid: boolean }>
  showAddMemberForm: boolean
  users: User[]
}>()
const dropdown = ref<boolean>(true)

const formData = ref(props.formData)
const showAddMemberForm = ref<boolean>(props.showAddMemberForm)
watch(
  [() => props.showAddMemberForm, formData],
  ([newShowAddMemberForm, newFormData]) => {
    emits('updateForm', newFormData)
    showAddMemberForm.value = newShowAddMemberForm
  },
  { deep: true }
)
</script>
